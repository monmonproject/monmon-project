jest.mock('../../telegram/router', () => ({ handleTelegramUpdate: jest.fn() }));

const request = require('supertest');
const app = require('../../app');
const { handleTelegramUpdate } = require('../../telegram/router');

const textUpdate = {
  update_id: 300001,
  message: {
    message_id: 42,
    from: { id: 123456789, first_name: 'Budi' },
    chat: { id: 123456789, type: 'private' },
    text: 'makan siang 35rb',
  },
};

function sendUpdate(update) {
  return request(app)
    .post('/webhook/telegram')
    .set('X-Telegram-Bot-Api-Secret-Token', process.env.TELEGRAM_WEBHOOK_SECRET)
    .send(update);
}

// Jalur produksi hanya aktif kalau NODE_ENV bukan 'test'. Nilai asli disimpan
// dan SELALU dikembalikan, walaupun test di dalamnya gagal.
async function withNodeEnv(value, testBody) {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    await testBody();
  } finally {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  }
}

// Menunggu callback setImmediate di route, lalu microtask .catch()-nya.
async function flushImmediate() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('routes/webhook POST /telegram', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    handleTelegramUpdate.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('mode test', () => {
    it('memproses update dulu lalu membalas 200', async () => {
      handleTelegramUpdate.mockResolvedValue();

      const response = await sendUpdate(textUpdate);

      expect(response.status).toBe(200);
      expect(handleTelegramUpdate).toHaveBeenCalledWith(textUpdate);
    });

    it('error dari handler diteruskan ke errorHandler → 500', async () => {
      handleTelegramUpdate.mockRejectedValue({ name: 'UnexpectedError', message: 'gagal' });

      const response = await sendUpdate(textUpdate);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
    });
  });

  describe('mode produksi (SPEC.md §5 no. 11: balas 200 dulu, proses berat setelahnya)', () => {
    it('membalas 200 tanpa menunggu handler selesai', async () => {
      await withNodeEnv('production', async () => {
        // Handler yang tidak pernah selesai: kalau route menunggunya, request ini timeout.
        handleTelegramUpdate.mockReturnValue(new Promise(() => {}));

        const response = await sendUpdate(textUpdate);

        expect(response.status).toBe(200);
      });
    });

    it('memanggil handler dengan body update setelah response terkirim', async () => {
      await withNodeEnv('production', async () => {
        handleTelegramUpdate.mockResolvedValue();

        await sendUpdate(textUpdate);
        await flushImmediate();

        expect(handleTelegramUpdate).toHaveBeenCalledTimes(1);
        expect(handleTelegramUpdate).toHaveBeenCalledWith(textUpdate);
      });
    });

    it('handler gagal → dicatat lewat console.error tanpa isi pesan user, proses tidak crash', async () => {
      await withNodeEnv('production', async () => {
        handleTelegramUpdate.mockRejectedValue({ name: 'DatabaseError', message: 'koneksi putus' });

        const response = await sendUpdate(textUpdate);
        await flushImmediate();

        expect(response.status).toBe(200);
        expect(consoleErrorSpy).toHaveBeenCalledWith({
          event: 'telegram.process.failed',
          message: 'koneksi putus',
        });

        // AGENTS.md §7: isi pesan user tidak boleh masuk log
        const loggedOutput = JSON.stringify(consoleErrorSpy.mock.calls);
        expect(loggedOutput).not.toContain('makan siang');
      });
    });

    it('NODE_ENV dikembalikan ke nilai aslinya setelah test produksi', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });
  });
});
