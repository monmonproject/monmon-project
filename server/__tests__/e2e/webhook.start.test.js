jest.mock('../../telegram/client', () => require('../mocks/telegramClient'));

const request = require('supertest');
const app = require('../../app');
const dateHelper = require('../../helpers/dateHelper');
const { TRIAL_DAYS } = require('../../config/constants');
const { User, Wallet, Category } = require('../../models');
const telegramClient = require('../mocks/telegramClient');
const startPayload = require('../fixtures/telegram/start.json');

describe('E1: /start user baru', () => {
  beforeEach(() => {
    telegramClient.reset();
    jest.spyOn(dateHelper, 'now').mockReturnValue(new Date('2026-08-26T10:00:00Z'));
  });

  afterEach(() => {
    dateHelper.now.mockRestore();
  });

  it('membuat User + Wallet + 12 kategori, trialEndsAt +5 hari, balas 200', async () => {
    const response = await request(app)
      .post('/webhook/telegram')
      .set('X-Telegram-Bot-Api-Secret-Token', process.env.TELEGRAM_WEBHOOK_SECRET)
      .send(startPayload);

    expect(response.status).toBe(200);

    const user = await User.findOne({ where: { telegramId: 123456789 } });
    expect(user).not.toBeNull();
    expect(user.username).toBe('budi');
    expect(user.trialStartedAt).toEqual(new Date('2026-08-26T10:00:00Z'));

    const expectedTrialEnd = new Date('2026-08-26T10:00:00Z');
    expectedTrialEnd.setDate(expectedTrialEnd.getDate() + TRIAL_DAYS);
    expect(user.trialEndsAt).toEqual(expectedTrialEnd);

    const wallet = await Wallet.findOne({ where: { UserId: user.id } });
    expect(wallet).not.toBeNull();
    expect(wallet.name).toBe('Dompet Utama');

    const categories = await Category.findAll({ where: { WalletId: wallet.id } });
    expect(categories).toHaveLength(12);

    const expenseCount = categories.filter((c) => c.type === 'expense').length;
    const incomeCount = categories.filter((c) => c.type === 'income').length;
    expect(expenseCount).toBe(8);
    expect(incomeCount).toBe(4);

    const messages = telegramClient.getSentMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].chatId).toBe(123456789);
    expect(messages[0].text).toContain('Trial 5 hari');
  });
});