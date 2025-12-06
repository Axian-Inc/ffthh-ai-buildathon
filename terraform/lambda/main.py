import base64
import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict

from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.session import Session

logger = logging.getLogger()
logger.setLevel(logging.INFO)

MODEL_ID = os.getenv("MODEL_ID", "us.anthropic.claude-3-sonnet-20240229-v1:0")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "256"))
STYLE_CHECK_PROMPT = """If the text below doesn't resemble the speach style illustrated in examples below, 
reject the text and return a message in the format: [REJECTED, reason: ...] and provide
the brief reasons there.
Below are the exmples:
    - Methinks the hour grows late, and yet my restless heart finds no desire for sleep.
    - Thou speakest in riddles, good sir, and I fear thy meaning dances just beyond my grasp.
    - If honor be thy compass, then surely no tempest shall turn thee from thy path.
    - O cruel fate, that thou shouldst toy with mortal hopes as though they were but trifles!
    - In her eyes I beheld a light so rare, it did outshine the very stars of night.

If you find the speach style to match that of the examples, return: [ACCEPTED]

Below is the text to be tested as described above:
"""


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
    region = os.environ.get("AWS_REGION", "us-west-2")
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
        body_json = json.dumps(body)
        endpoint = f"https://bedrock-runtime.{region}.amazonaws.com/model/{MODEL_ID}/invoke"
        aws_request = AWSRequest(method="POST", url=endpoint, data=body_json.encode("utf-8"))
        credentials = Session().get_credentials()
        SigV4Auth(credentials.get_frozen_credentials(), "bedrock", region).add_auth(aws_request)

        http_request = urllib.request.Request(
            endpoint,
            data=body_json.encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                **dict(aws_request.headers.items()),
            },
        )

        with urllib.request.urlopen(http_request, timeout=10) as resp:
            raw_body = resp.read().decode("utf-8")

        response_body = json.loads(raw_body or "{}")
        content = response_body.get("content") or []
        if content and isinstance(content, list):
            first = content[0]
            if isinstance(first, dict):
                text = first.get("text")
                if isinstance(text, str):
                    return text
        return json.dumps(response_body)
    except (ValueError, urllib.error.URLError) as exc:
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
        bedrock_reply = call_bedrock(STYLE_CHECK_PROMPT + "\n" + message_text)
    except (ValueError, RuntimeError) as exc:
        logger.exception("Request handling failed")
        return {"statusCode": 400, "body": json.dumps({"error": str(exc)})}

    response_body = {"response": bedrock_reply}

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(response_body),
    }
