const sentMessages = [];

function reset() {
  sentMessages.length = 0;
}

async function sendMessage(chatId, text, options = {}) {
  sentMessages.push({ chatId, text, options });
  return { ok: true };
}

function getSentMessages() {
  return [...sentMessages];
}

module.exports = { sendMessage, reset, getSentMessages };