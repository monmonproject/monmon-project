const telegramClient = require('../../telegram/client');

function restoreEnv(key, originalValue) {
  if (originalValue === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = originalValue;
  }
}

describe('telegram/client sendMessage', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  let fetchSpy;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-test';
    // fetch SELALU di-mock: tidak boleh ada panggilan jaringan di test
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    restoreEnv('TELEGRAM_BOT_TOKEN', originalToken);
  });

  it('memanggil endpoint sendMessage Bot API dengan POST dan body JSON', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await telegramClient.sendMessage(123456789, 'Halo');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, request] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottoken-test/sendMessage');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(request.body)).toEqual({ chat_id: 123456789, text: 'Halo' });
  });

  it('menggabungkan options (mis. reply_markup) ke body', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const replyMarkup = { inline_keyboard: [[{ text: 'Ya', callback_data: 'yes' }]] };

    await telegramClient.sendMessage(123456789, 'Simpan?', { reply_markup: replyMarkup });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toEqual({ chat_id: 123456789, text: 'Simpan?', reply_markup: replyMarkup });
  });

  it('mengembalikan isi JSON dari Telegram kalau response ok', async () => {
    const telegramResponse = { ok: true, result: { message_id: 77 } };
    fetchSpy.mockResolvedValue({ ok: true, json: async () => telegramResponse });

    const result = await telegramClient.sendMessage(123456789, 'Halo');

    expect(result).toEqual(telegramResponse);
  });

  it('melempar TelegramError kalau response tidak ok', async () => {
    fetchSpy.mockResolvedValue({ ok: false, json: async () => ({ ok: false }) });

    await expect(telegramClient.sendMessage(123456789, 'Halo')).rejects.toEqual({
      name: 'TelegramError',
      message: 'Gagal kirim pesan ke Telegram',
    });
  });
});
