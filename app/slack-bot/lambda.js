// Slack bot that calls AWS Bedrock to generate a friendly response.
const { App, AwsLambdaReceiver } = require('@slack/bolt');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

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

const decodeBody = (body) => {
  if (!body) return {};
  try {
    return JSON.parse(Buffer.from(body).toString());
  } catch (error) {
    console.error('Failed to decode Bedrock response', error);
    return {};
  }
};

const buildPrompt = (text) =>
  `You are a concise Slack helper. Respond with a short "hello world" style message acknowledging this Slack text: "${text}". Keep it under 15 words.`;

const getBedrockReply = async (text, logger) => {
  try {
    const input = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: buildPrompt(text || 'a new Slack message'),
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
    const reply = await getBedrockReply(text, logger);
    await say(reply);
    logger.info(`Replied to message in channel ${event.channel} using Bedrock model ${modelId}`);
  } catch (error) {
    logger.error('Failed to send response', error);
  }
});

// Expose the AWS Lambda handler entrypoint.
module.exports.handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
