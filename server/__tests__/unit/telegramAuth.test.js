const telegramAuth = require('../../middlewares/telegramAuth');

const TEST_SECRET = 'secret-unit-test';
const ATTACKER_HEADER = 'header-dari-penyerang';
const EXPECTED_ERROR = { name: 'Unauthorized', message: 'Invalid webhook secret' };

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function buildReq(headerValue) {
  if (headerValue === undefined) {
    return { headers: {} };
  }
  return { headers: { 'x-telegram-bot-api-secret-token': headerValue } };
}

// Secret dipasang per test, bukan diambil dari .env, supaya test tetap
// bermakna di lingkungan tanpa .env (kondisi yang memicu issue #40).
function setSecret(value) {
  if (value === undefined) {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  } else {
    process.env.TELEGRAM_WEBHOOK_SECRET = value;
  }
}

function runMiddleware(headerValue) {
  const next = jest.fn();
  telegramAuth(buildReq(headerValue), mockRes(), next);
  return next;
}

function expectRejected(next) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith(EXPECTED_ERROR);
}

describe('telegramAuth', () => {
  const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    setSecret(originalSecret);
  });

  describe('secret belum dikonfigurasi → gagal-tertutup (issue #40)', () => {
    it('env tidak di-set + ada header → ditolak', () => {
      setSecret(undefined);

      expectRejected(runMiddleware(ATTACKER_HEADER));
    });

    it('env tidak di-set + tanpa header → ditolak', () => {
      setSecret(undefined);

      expectRejected(runMiddleware(undefined));
    });

    it('env string kosong + header string kosong → ditolak', () => {
      setSecret('');

      expectRejected(runMiddleware(''));
    });

    it('env string kosong + tanpa header → ditolak', () => {
      setSecret('');

      expectRejected(runMiddleware(undefined));
    });

    // Header dikontrol penuh oleh pengirim. Env berisi spasi saja harus
    // dianggap belum dikonfigurasi, kalau tidak header '   ' akan lolos.
    it('env berisi spasi saja + header spasi yang sama → ditolak', () => {
      setSecret('   ');

      expectRejected(runMiddleware('   '));
    });
  });

  describe('secret sudah dikonfigurasi', () => {
    beforeEach(() => {
      setSecret(TEST_SECRET);
    });

    it('header cocok → next() dipanggil tanpa error', () => {
      const next = runMiddleware(TEST_SECRET);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('header salah → ditolak', () => {
      expectRejected(runMiddleware(ATTACKER_HEADER));
    });

    it('tanpa header → ditolak', () => {
      expectRejected(runMiddleware(undefined));
    });

    it('header string kosong → ditolak', () => {
      expectRejected(runMiddleware(''));
    });

    it('header = secret + karakter tambahan → ditolak', () => {
      expectRejected(runMiddleware(`${TEST_SECRET}x`));
    });

    it('header = sebagian awal secret → ditolak', () => {
      expectRejected(runMiddleware(TEST_SECRET.slice(0, 6)));
    });

    it('tidak menulis log secret_not_configured kalau secret ada', () => {
      runMiddleware(ATTACKER_HEADER);

      expect(consoleErrorSpy).not.toHaveBeenCalledWith({ event: 'telegram.webhook.secret_not_configured' });
    });
  });

  describe('tidak membocorkan informasi ke pemanggil', () => {
    it('error "belum dikonfigurasi" identik dengan error "secret salah"', () => {
      setSecret(undefined);
      const errorWhenNotConfigured = runMiddleware(ATTACKER_HEADER).mock.calls[0][0];

      setSecret(TEST_SECRET);
      const errorWhenWrong = runMiddleware(ATTACKER_HEADER).mock.calls[0][0];

      expect(errorWhenNotConfigured).toEqual(errorWhenWrong);
    });

    it('objek error tidak memuat nilai secret maupun nilai header', () => {
      setSecret(TEST_SECRET);

      const error = runMiddleware(ATTACKER_HEADER).mock.calls[0][0];
      const serializedError = JSON.stringify(error);

      expect(serializedError).not.toContain(TEST_SECRET);
      expect(serializedError).not.toContain(ATTACKER_HEADER);
    });
  });

  describe('log untuk operator', () => {
    it('secret tidak di-set → console.error dengan event secret_not_configured', () => {
      setSecret(undefined);

      runMiddleware(ATTACKER_HEADER);

      expect(consoleErrorSpy).toHaveBeenCalledWith({ event: 'telegram.webhook.secret_not_configured' });
    });

    it('secret string kosong → console.error dengan event secret_not_configured', () => {
      setSecret('');

      runMiddleware('');

      expect(consoleErrorSpy).toHaveBeenCalledWith({ event: 'telegram.webhook.secret_not_configured' });
    });

    it('secret berisi spasi saja → console.error dengan event secret_not_configured', () => {
      setSecret('   ');

      runMiddleware('   ');

      expect(consoleErrorSpy).toHaveBeenCalledWith({ event: 'telegram.webhook.secret_not_configured' });
    });

    it('tidak ada log yang memuat nilai secret maupun nilai header', () => {
      setSecret(undefined);
      runMiddleware(ATTACKER_HEADER);

      setSecret(TEST_SECRET);
      runMiddleware(ATTACKER_HEADER);
      runMiddleware(TEST_SECRET);

      const loggedOutput = JSON.stringify(consoleErrorSpy.mock.calls);
      expect(loggedOutput).not.toContain(TEST_SECRET);
      expect(loggedOutput).not.toContain(ATTACKER_HEADER);
    });
  });
});
