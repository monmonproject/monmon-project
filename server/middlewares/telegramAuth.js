function telegramAuth(req, res, next) {
  try {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      throw { name: 'Unauthorized', message: 'Invalid webhook secret' };
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = telegramAuth;