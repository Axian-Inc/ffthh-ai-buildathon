// Slack "Hello World" bot for AWS Lambda using Slack Bolt HTTP receiver.
const { App, AwsLambdaReceiver } = require('@slack/bolt');

const signingSecret = process.env.SLACK_SIGNING_SECRET;
const botToken = process.env.SLACK_BOT_TOKEN;

if (!signingSecret || !botToken) {
  console.warn('Missing Slack credentials: SLACK_SIGNING_SECRET and SLACK_BOT_TOKEN are required.');
}

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret,
});

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
    await say(`I saw that! ${text}`);
    logger.info(`Replied to message in channel ${event.channel}`);
  } catch (error) {
    logger.error('Failed to send response', error);
  }
});

// Expose the AWS Lambda handler entrypoint.
module.exports.handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
