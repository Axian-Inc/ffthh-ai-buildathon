import base64
import json
import logging
import os
from typing import Any, Dict

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

MODEL_ID = os.getenv("MODEL_ID", "us.anthropic.claude-3-sonnet-20240229-v1:0")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "256"))


def decode_body(event: Dict[str, Any]) -> Dict[str, Any]:
    body = event.get("body")
    if not body:
        return {}

    try:
        if event.get("isBase64Encoded"):
            decoded = base64.b64decode(body)
            return json.loads(decoded)
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON") from exc


def extract_message_text(payload: Dict[str, Any]) -> str:
    event = payload.get("event")
    if not isinstance(event, dict):
        raise ValueError("Missing event object")
    text = event.get("text")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Missing event.text")
    return text.strip()


def call_bedrock(prompt: str) -> str:
    client = boto3.client("bedrock-runtime")
    body = {
        "max_tokens": MAX_TOKENS,
        "anthropic_version": "bedrock-2023-05-31",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    }
    try:
        response = client.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )
        raw_body = response.get("body")
        if hasattr(raw_body, "read"):
            raw_body = raw_body.read()
        if isinstance(raw_body, bytes):
            raw_body = raw_body.decode("utf-8")
        response_body = json.loads(raw_body or "{}")
        content = response_body.get("content") or []
        if content and isinstance(content, list):
            first = content[0]
            if isinstance(first, dict):
                text = first.get("text")
                if isinstance(text, str):
                    return text
        return json.dumps(response_body)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Bedrock invocation failed")
        raise RuntimeError(f"Bedrock invoke failed: {exc}") from exc


def handler(event, context):
    try:
        payload = decode_body(event)
    except ValueError as exc:
        return {"statusCode": 400, "body": json.dumps({"error": str(exc)})}

    if not isinstance(payload, dict):
        return {"statusCode": 400, "body": json.dumps({"error": "JSON body must be an object"})}

    try:
        message_text = extract_message_text(payload)
        bedrock_reply = call_bedrock(message_text)
    except (ValueError, RuntimeError) as exc:
        logger.exception("Request handling failed")
        return {"statusCode": 400, "body": json.dumps({"error": str(exc)})}

    response_body = {
        "source": "yolo-lambda",
        "model": MODEL_ID,
        "input_text": message_text,
        "response": bedrock_reply,
    }

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(response_body),
    }
