jest.mock('../../telegram/client', () => require('../mocks/telegramClient'));
jest.mock('../../services/onboardingService', () => ({
  findByTelegramId: jest.fn(),
  registerNewUser: jest.fn(),
}));

const { handleTelegramUpdate } = require('../../telegram/router');
const OnboardingService = require('../../services/onboardingService');
const dateHelper = require('../../helpers/dateHelper');
const telegramClient = require('../mocks/telegramClient');

// processedUpdateIds adalah state modul, jadi tiap test wajib memakai
// update_id yang berbeda supaya tidak saling memengaruhi.
let nextUpdateId = 500000;

function buildUpdate(messageOverrides = {}) {
  nextUpdateId += 1;
  return {
    update_id: nextUpdateId,
    message: {
      message_id: 42,
      from: { id: 123456789, first_name: 'Budi', username: 'budi' },
      chat: { id: 123456789, type: 'private' },
      date: 1755840000,
      text: '/start',
      ...messageOverrides,
    },
  };
}

describe('telegram/router handleTelegramUpdate', () => {
  const now = new Date('2026-08-26T10:00:00Z');

  beforeEach(() => {
    telegramClient.reset();
    OnboardingService.findByTelegramId.mockReset();
    OnboardingService.registerNewUser.mockReset();
    jest.spyOn(dateHelper, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    dateHelper.now.mockRestore();
  });

  describe('/start', () => {
    it('user baru → registerNewUser dipanggil dengan profil Telegram dan now, lalu sambutan dikirim', async () => {
      OnboardingService.findByTelegramId.mockResolvedValue(null);
      OnboardingService.registerNewUser.mockResolvedValue({ id: 1 });
      const update = buildUpdate();

      await handleTelegramUpdate(update);

      expect(OnboardingService.findByTelegramId).toHaveBeenCalledWith(123456789);
      expect(OnboardingService.registerNewUser).toHaveBeenCalledWith(update.message.from, now);

      const messages = telegramClient.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].chatId).toBe(123456789);
      expect(messages[0].text).toContain('Halo Budi!');
    });

    it('user lama → TIDAK registrasi ulang (trial sekali seumur hidup), sambutan tetap dikirim', async () => {
      OnboardingService.findByTelegramId.mockResolvedValue({ id: 1 });

      await handleTelegramUpdate(buildUpdate());

      expect(OnboardingService.registerNewUser).not.toHaveBeenCalled();
      expect(telegramClient.getSentMessages()).toHaveLength(1);
    });

    it('"/start ref123" (deep link) tetap diperlakukan sebagai /start', async () => {
      OnboardingService.findByTelegramId.mockResolvedValue(null);
      OnboardingService.registerNewUser.mockResolvedValue({ id: 1 });

      await handleTelegramUpdate(buildUpdate({ text: '/start ref123' }));

      expect(OnboardingService.registerNewUser).toHaveBeenCalledTimes(1);
      expect(telegramClient.getSentMessages()).toHaveLength(1);
    });

    it('"/startabc" bukan /start → tidak registrasi dan tidak membalas', async () => {
      await handleTelegramUpdate(buildUpdate({ text: '/startabc' }));

      expect(OnboardingService.findByTelegramId).not.toHaveBeenCalled();
      expect(telegramClient.getSentMessages()).toHaveLength(0);
    });
  });

  describe('idempotensi update_id (SPEC.md §5 no. 10)', () => {
    it('update_id yang sama dikirim dua kali → hanya diproses sekali', async () => {
      OnboardingService.findByTelegramId.mockResolvedValue(null);
      OnboardingService.registerNewUser.mockResolvedValue({ id: 1 });
      const update = buildUpdate();

      await handleTelegramUpdate(update);
      await handleTelegramUpdate(update);

      expect(OnboardingService.registerNewUser).toHaveBeenCalledTimes(1);
      expect(telegramClient.getSentMessages()).toHaveLength(1);
    });
  });

  describe('update yang bukan pesan teks biasa', () => {
    it('update tanpa message (mis. callback_query) → tidak crash, tidak ada efek', async () => {
      nextUpdateId += 1;
      const update = { update_id: nextUpdateId, callback_query: { id: 'cb1', data: 'yes' } };

      await expect(handleTelegramUpdate(update)).resolves.toBeUndefined();

      expect(OnboardingService.findByTelegramId).not.toHaveBeenCalled();
      expect(telegramClient.getSentMessages()).toHaveLength(0);
    });

    it('message tanpa from → tidak crash, tidak ada efek', async () => {
      const update = buildUpdate();
      delete update.message.from;

      await expect(handleTelegramUpdate(update)).resolves.toBeUndefined();

      expect(OnboardingService.findByTelegramId).not.toHaveBeenCalled();
      expect(telegramClient.getSentMessages()).toHaveLength(0);
    });

    it('message tanpa text (mis. voice) → tidak crash dan tidak menyentuh onboarding', async () => {
      const update = buildUpdate({ voice: { file_id: 'voice-file-id' } });
      delete update.message.text;

      await expect(handleTelegramUpdate(update)).resolves.toBeUndefined();

      expect(OnboardingService.findByTelegramId).not.toHaveBeenCalled();
      expect(OnboardingService.registerNewUser).not.toHaveBeenCalled();
    });
  });
});
