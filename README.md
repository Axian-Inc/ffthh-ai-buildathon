# Slack “Hello World” Lambda Bot – Requirements for Codex

## Overview

Create a simple Slack bot using **Slack Bolt for JavaScript** running on **AWS Lambda**. The bot will listen to messages in channels it’s a member of and respond by echoing what it “saw.”

The project consists of:

1. A **Node.js Slack Bolt application** in `/app/slack-bot` that handles Slack events.
2. An **AWS Lambda function** (with any required API Gateway or Lambda URL configuration) defined via **Terraform** under the `/terraform` directory.

---

## Functional Requirements

### 1. Basic Behavior

- The bot should behave as a “hello world” Slack bot.
- When a user posts a message in a channel where the bot is present:
  - If the message **did not** come from the bot itself, the bot should post a response message:
    - Response format:  
      **`I saw that! <original message text>`**
    - Example:  
      - User message: `Hello world!`  
      - Bot message: `I saw that! Hello world!`
  - If the message **did come from the bot** (i.e., a self-generated message), **do not respond** (avoid infinite loops).

### 2. Message Source Filtering

- The bot must correctly distinguish between:
  - Messages sent by **users**.
  - Messages sent by **this bot** (the Lambda).
- The bot must **ignore**:
  - Messages that the bot itself posts.
  - Any system or event messages that don’t contain user text (if applicable).

---

## Technical Requirements – Application (Node.js + Slack Bolt)

### 1. Tech Stack

- Language: **Node.js** (LTS version; e.g., 18.x or later).
- Framework: **Slack Bolt for JavaScript**.
- Runtime: **AWS Lambda** (Node.js runtime matching the chosen Node version).

### 2. Slack App & Bolt Configuration

- Use **Slack Bolt** in “HTTP receiver” mode appropriate for AWS Lambda.
- The app must:
  - Listen for **message events** in channels where the bot is a member.
  - Use the standard Bolt middleware/event handlers to process incoming messages.
- Bot configuration assumptions (environment variables expected):
  - `SLACK_BOT_TOKEN`
  - `SLACK_SIGNING_SECRET`
- Any additional configuration values needed by Bolt in a Lambda environment (e.g., `SLACK_APP_TOKEN` if using Socket Mode) should be clearly defined, but primary requirement is HTTP/event-based via Lambda.

### 3. Event Handling Logic

Pseudocode-level behavior:

1. Receive a Slack event (e.g., `event.callback` from AWS Lambda / API Gateway).
2. Verify request authenticity using the Slack signing secret.
3. Extract:
   - `event.user`
   - `event.text`
   - `event.channel`
   - `event.bot_id` (or equivalent field) if present.
4. If the message is from this bot:
   - Do **nothing** (end handler).
5. Otherwise:
   - Post a message back to the same channel:
     - Text: `I saw that! <original message text>`

### 4. Error Handling & Logging

- Log basic diagnostic information (e.g., when events are received, when replies are sent).
- If posting the response fails, log the error (stack trace / message).
- No advanced retry logic is required for this “hello world” scenario.

---

## AWS Requirements

### 1. Lambda Configuration

- Implement the Slack Bolt app as an **AWS Lambda** function.
- The Lambda should:
  - Be triggered via an HTTP endpoint (e.g., **API Gateway** or **Lambda URL**) compatible with Slack’s event delivery.
  - Handle Slack URL verification (if necessary) for Event Subscriptions.
- Environment variables for the Lambda (at a minimum):
  - `SLACK_BOT_TOKEN`
  - `SLACK_SIGNING_SECRET`
- Node.js runtime: use a current AWS-supported runtime (e.g., `nodejs18.x`).

### 2. Terraform Layout

- The AWS Lambda and its associated infrastructure must be defined using **Terraform**.
- Terraform code location:
  - `/terraform`
- Terraform should define:
  - The Lambda function (including:
    - Runtime
    - Handler
    - Role and basic policies sufficient to write CloudWatch logs.
    - Environment variables.)
  - The HTTP integration for Slack (e.g., API Gateway, Lambda URL, or equivalent).
  - Any necessary permissions to allow the HTTP integration to invoke the Lambda.

> Note: The Terraform definitions must be complete enough that, after applying, we have a working Lambda endpoint that Slack can call.

---

## Non-Requirements / Simplifications

- No need for:
  - Persistence (databases, S3, etc.).
  - Complex routing or multiple commands.
  - Advanced logging/monitoring beyond basic CloudWatch logs.
- This is strictly a **“hello world” echo-style bot** that demonstrates:
  - Receiving messages from Slack via Lambda.
  - Responding to those messages.
  - Ignoring its own messages.

---

## Deliverables Summary

1. **Node.js Slack Bolt application** in `/app/slack-bot`:
   - Exposes a handler suitable for AWS Lambda.
   - Responds with `I saw that! <original message text>` to user messages.
   - Ignores messages from itself.

2. **Terraform configuration** under `/terraform`:
   - Defines the Lambda function and its execution role.
   - Defines the HTTP integration (API Gateway or Lambda URL) for Slack events.
   - Sets required environment variables for Slack Bolt.

3. **All code structured** so that, once:
   - Terraform is applied.
   - Slack app is configured to send events to the Lambda’s public endpoint.
   - Required environment variables are set.
   
   …the bot will work as a functioning “hello world” Slack bot in a channel.
