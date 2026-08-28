const OnboardingService = require('../services/onboardingService');
const dateHelper = require('../helpers/dateHelper');
const telegramClient = require('./client');
const { welcomeMessage } = require('./formatter');

const processedUpdateIds = new Set();

async function handleTelegramUpdate(update) {
  if (processedUpdateIds.has(update.update_id)) {
    return;
  }
  processedUpdateIds.add(update.update_id);

  const message = update.message;
  if (!message || !message.from) {
    return;
  }

  const telegramId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text || '';

  if (text === '/start' || text.startsWith('/start ')) {
    const now = dateHelper.now();
    let user = await OnboardingService.findByTelegramId(telegramId);

    if (!user) {
      user = await OnboardingService.registerNewUser(message.from, now);
    }

    await telegramClient.sendMessage(chatId, welcomeMessage(message.from.first_name));
  }
}

module.exports = { handleTelegramUpdate };