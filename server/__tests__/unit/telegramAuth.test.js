const telegramAuth = require('../../middlewares/telegramAuth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('telegramAuth', () => {
  it('memanggil next() kalau secret token cocok', () => {
    const req = { headers: { 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET } };
    const next = jest.fn();

    telegramAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('memanggil next(error) kalau secret token salah', () => {
    const req = { headers: { 'x-telegram-bot-api-secret-token': 'salah' } };
    const next = jest.fn();

    telegramAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Unauthorized' })
    );
  });
});