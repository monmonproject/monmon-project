const express = require('express');
const telegramAuth = require('../middlewares/telegramAuth');
const { handleTelegramUpdate } = require('../telegram/router');

const router = express.Router();

router.post('/telegram', telegramAuth, async (req, res, next) => {
  try {
    res.status(200).send();

    if (process.env.NODE_ENV === 'test') {
      await handleTelegramUpdate(req.body);
    } else {
      setImmediate(() => {
        handleTelegramUpdate(req.body).catch((error) => {
          console.error({ event: 'telegram.process.failed', message: error.message });
        });
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;