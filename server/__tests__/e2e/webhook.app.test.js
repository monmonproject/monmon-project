jest.mock('../../telegram/client', () => require('../mocks/telegramClient'));

const request = require('supertest');
const app = require('../../app');
const dateHelper = require('../../helpers/dateHelper');
const { User, Wallet, Category } = require('../../models');
const telegramClient = require('../mocks/telegramClient');
const startPayload = require('../fixtures/telegram/start.json');

function sendUpdate(update) {
  return request(app)
    .post('/webhook/telegram')
    .set('X-Telegram-Bot-Api-Secret-Token', process.env.TELEGRAM_WEBHOOK_SECRET)
    .send(update);
}

describe('GET /health', () => {
  it('membalas 200 dengan { message: "OK" } untuk uptime monitor', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'OK' });
  });
});

describe('Webhook /start', () => {
  const firstStartTime = new Date('2026-08-26T10:00:00Z');
  const secondStartTime = new Date('2026-08-28T10:00:00Z');

  beforeEach(() => {
    telegramClient.reset();
    jest.spyOn(dateHelper, 'now').mockReturnValue(firstStartTime);
  });

  afterEach(() => {
    dateHelper.now.mockRestore();
  });

  it('E2: /start dua kali → tidak ada duplikat dan trial tidak diperpanjang', async () => {
    await sendUpdate({ ...startPayload, update_id: 200001 });
    const userAfterFirstStart = await User.findOne({ where: { telegramId: 123456789 } });

    dateHelper.now.mockReturnValue(secondStartTime);
    const response = await sendUpdate({ ...startPayload, update_id: 200002 });

    expect(response.status).toBe(200);
    expect(await User.count()).toBe(1);
    expect(await Wallet.count()).toBe(1);
    expect(await Category.count()).toBe(12);

    const userAfterSecondStart = await User.findOne({ where: { telegramId: 123456789 } });
    expect(userAfterSecondStart.trialStartedAt).toEqual(userAfterFirstStart.trialStartedAt);
    expect(userAfterSecondStart.trialEndsAt).toEqual(userAfterFirstStart.trialEndsAt);

    const messages = telegramClient.getSentMessages();
    expect(messages).toHaveLength(2);
    expect(messages[1].chatId).toBe(123456789);
  });

  it('E19: update_id yang sama dikirim dua kali → hanya 1 user dan 1 balasan', async () => {
    const update = { ...startPayload, update_id: 200003 };

    const firstResponse = await sendUpdate(update);
    const secondResponse = await sendUpdate(update);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await User.count()).toBe(1);
    expect(telegramClient.getSentMessages()).toHaveLength(1);
  });
});
