const dateHelper = require('../../helpers/dateHelper');

describe('helpers/dateHelper now', () => {
  const frozenTime = new Date('2026-08-26T10:00:00Z');

  beforeEach(() => {
    // Hanya Date yang dibekukan; timer asli dibiarkan supaya koneksi DB
    // di setup.js tidak ikut terhenti.
    jest.useFakeTimers({
      now: frozenTime,
      doNotFake: [
        'nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout',
        'setInterval', 'clearInterval', 'queueMicrotask',
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('mengembalikan waktu sistem saat ini sebagai Date', () => {
    const result = dateHelper.now();

    expect(result).toBeInstanceOf(Date);
    expect(result).toEqual(frozenTime);
  });

  it('mengembalikan instance baru tiap dipanggil, jadi mutasi pemanggil tidak bocor', () => {
    const first = dateHelper.now();
    first.setDate(first.getDate() + 5);

    expect(dateHelper.now()).toEqual(frozenTime);
  });
});
