// middlewares/telegramAuth.js
//
// Gagal-tertutup: kalau TELEGRAM_WEBHOOK_SECRET belum dikonfigurasi, SEMUA
// request ditolak (issue #40). Pemanggil selalu menerima error yang sama,
// supaya tidak bisa membedakan "belum dikonfigurasi" dari "secret salah".
// Nilai secret dan nilai header tidak pernah masuk log atau pesan error.

function isSecretConfigured(expectedSecret) {
  // Kosong setelah di-trim dianggap belum dikonfigurasi: header dikontrol
  // penuh oleh pengirim, jadi env '   ' bisa dicocokkan dengan header '   '.
  return typeof expectedSecret === 'string' && expectedSecret.trim() !== '';
}

function telegramAuth(req, res, next) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];

    if (!isSecretConfigured(expectedSecret)) {
      console.error({ event: 'telegram.webhook.secret_not_configured' });
      throw { name: 'Unauthorized', message: 'Invalid webhook secret' };
    }
    if (receivedSecret !== expectedSecret) {
      throw { name: 'Unauthorized', message: 'Invalid webhook secret' };
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = telegramAuth;
