const { welcomeMessage } = require('../../telegram/formatter');
const { TRIAL_DAYS } = require('../../config/constants');

// SPEC.md §7: balasan bot maksimal ~12 baris
const MAX_REPLY_LINES = 12;

describe('telegram/formatter welcomeMessage', () => {
  it('menyapa dengan nama kalau nama ada', () => {
    const lines = welcomeMessage('Budi').split('\n');

    expect(lines[0]).toBe('Halo Budi! 👋');
  });

  it('menyapa tanpa nama kalau nama kosong', () => {
    const lines = welcomeMessage(undefined).split('\n');

    expect(lines[0]).toBe('Halo! 👋');
  });

  it('menyebut durasi trial sesuai TRIAL_DAYS', () => {
    expect(welcomeMessage('Budi')).toContain(`Trial ${TRIAL_DAYS} hari`);
  });

  it('memberi contoh format pencatatan dan menunjuk /bantuan', () => {
    const message = welcomeMessage('Budi');

    expect(message).toContain('makan siang 35rb');
    expect(message).toContain('/bantuan');
  });

  it(`tidak lebih dari ${MAX_REPLY_LINES} baris (SPEC.md §7)`, () => {
    expect(welcomeMessage('Budi').split('\n').length).toBeLessThanOrEqual(MAX_REPLY_LINES);
  });
});
