async function sendMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...options }),
  });
  if (!response.ok) {
    throw { name: 'TelegramError', message: 'Gagal kirim pesan ke Telegram' };
  }
  return response.json();
}
module.exports = { sendMessage };