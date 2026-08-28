const express = require('express');
const telegramAuth = require('../middlewares/telegramAuth');
const { handleTelegramUpdate } = require('../telegram/router');

const router = express.Router();

router.post('/telegram', telegramAuth, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'test') {
      // Test: proses dulu, baru balas — supaya supertest tidak race dengan DB
      await handleTelegramUpdate(req.body);
      return res.status(200).send();
    }

    // Production: balas 200 dulu (SPEC), proses async setelahnya
    res.status(200).send();
    setImmediate(() => {
      handleTelegramUpdate(req.body).catch((error) => {
        console.error({ event: 'telegram.process.failed', message: error.message });
      });
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;