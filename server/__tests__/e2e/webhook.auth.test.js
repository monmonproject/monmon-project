const request = require('supertest');
const app = require('../../app');
const startPayload = require('../fixtures/telegram/start.json');
const { User } = require('../../models');

describe('Keamanan webhook', () => {
  it('E17: webhook tanpa secret token → 401, tidak ada efek samping', async () => {
    const response = await request(app)
      .post('/webhook/telegram')
      .send(startPayload);

    expect(response.status).toBe(401);
    const count = await User.count();
    expect(count).toBe(0);
  });

  it('E18: webhook secret token salah → 401', async () => {
    const response = await request(app)
      .post('/webhook/telegram')
      .set('X-Telegram-Bot-Api-Secret-Token', 'token-salah')
      .send(startPayload);

    expect(response.status).toBe(401);
    const count = await User.count();
    expect(count).toBe(0);
  });
});