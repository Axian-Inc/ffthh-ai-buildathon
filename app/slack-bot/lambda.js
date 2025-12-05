// Slack bot that calls AWS Bedrock to generate responses based on file-driven prompts.
const { App, AwsLambdaReceiver } = require('@slack/bolt');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const fs = require('fs');
const path = require('path');

const signingSecret = process.env.SLACK_SIGNING_SECRET;
const botToken = process.env.SLACK_BOT_TOKEN;
const modelId = process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-lite-v1';
const awsRegion = process.env.AWS_REGION || 'us-west-2';

if (!signingSecret || !botToken) {
  console.warn('Missing Slack credentials: SLACK_SIGNING_SECRET and SLACK_BOT_TOKEN are required.');
}

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret,
});

const bedrock = new BedrockRuntimeClient({ region: awsRegion });
const promptFiles = ['prompt1.txt', 'prompt2.txt'];
const promptCache = new Map();

const decodeBody = (body) => {
  if (!body) return {};
  try {
    return JSON.parse(Buffer.from(body).toString());
  } catch (error) {
    console.error('Failed to decode Bedrock response', error);
    return {};
  }
};

const loadPromptFromFile = async (filename, logger) => {
  if (promptCache.has(filename)) return promptCache.get(filename);

  const filePath = path.join(__dirname, filename);

  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    promptCache.set(filename, content);
    return content;
  } catch (error) {
    const log = logger?.error || console.error;
    log(`Failed to read prompt file ${filename}`, error);
    return '';
  }
};

const buildPrompt = (template, messageText) => {
  const text = messageText || 'a new Slack message';

  // Honor placeholder if present; otherwise tack the message onto the template.
  if (template && template.includes('{{text}}')) {
    return template.replace(/{{text}}/g, text);
  }

  const base = template?.trim() || 'You are a french speaker. Repeat back the given Slack message translated in french.';
  return `${base}\n\nMessage: "${text}"`;
};

const invokeBedrock = async (prompt, logger) => {
  try {
    const input = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: prompt,
      }),
    };

    const response = await bedrock.send(new InvokeModelCommand(input));
    const payload = decodeBody(response.body);
    const message = payload.results?.[0]?.outputText?.trim();
    return message || 'Hello from Bedrock!';
  } catch (error) {
    logger.error('Bedrock invocation failed', error);
    return 'Hello from Bedrock!';
  }
};

const getBedrockReplies = async (text, logger) => {
  const replies = [];

  for (const filename of promptFiles) {
    const template = await loadPromptFromFile(filename, logger);
    const prompt = buildPrompt(template, text);
    const reply = await invokeBedrock(prompt, logger);
    replies.push(reply);
  }

  return replies;
};

const app = new App({
  token: botToken,
  receiver: awsLambdaReceiver,
  processBeforeResponse: true, // ensures Lambda can respond to Slack before finishing work
});

// Echo user messages and ignore messages originating from bots (including this bot).
app.event('message', async ({ event, say, logger }) => {
  const { text = '', bot_id, subtype, user } = event;

  // Debug logging to help trace channel and token in CloudWatch.
  logger.info(`Incoming message event on channel ${event.channel || 'unknown'} using token ${botToken || 'unset'}`);

  // Skip if this is from any bot or lacks a user (system events).
  if (bot_id || subtype === 'bot_message' || !user) {
    logger.debug ? logger.debug('Ignoring bot/system message', { bot_id, subtype }) : logger.info('Ignoring bot/system message');
    return;
  }

  try {
    const replies = await getBedrockReplies(text, logger);
    const formatted = replies
      .map((reply, index) => `Response ${index + 1}: ${reply}`)
      .join('\n\n');

    await say(formatted);
    logger.info(`Replied to message in channel ${event.channel} using Bedrock model ${modelId} with ${replies.length} prompts`);
  } catch (error) {
    logger.error('Failed to send response', error);
  }
});

// Expose the AWS Lambda handler entrypoint.
module.exports.handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
