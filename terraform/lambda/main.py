import base64
import json


def handler(event, context):
    # HTTP API sends the request body as a string; decode if present
    try:
        body = event.get("body")
        if body:
            if event.get("isBase64Encoded"):
                body = json.loads(base64.b64decode(body))
            else:
                body = json.loads(body)
        else:
            body = {}
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON"})}

    if not isinstance(body, dict):
        return {"statusCode": 400, "body": json.dumps({"error": "JSON body must be an object"})}

    body["source"] = "yolo-lambda"
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
