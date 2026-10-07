const jwt = require('jsonwebtoken');
const authentication = require('../../middlewares/authentication');
const { signToken } = require('../../helpers/jwt');
const { User } = require('../../models');

const SECRET = 'rahasia-test';
const originalSecret = process.env.JWT_SECRET;

function buatReq(authorization) {
    const headers = {};
    if (authorization !== undefined) headers.authorization = authorization;
    return { headers };
}

beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
});

afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
});

describe('authentication - permintaan yang ditolak', () => {
    it('menolak jika header Authorization tidak dikirim', async () => {
        const req = buatReq(undefined);
        const next = jest.fn();

        await authentication(req, {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unauthorized', message: 'Token tidak valid' })
        );
        expect(req.user).toBeUndefined();
    });

    it('menolak jika skema bukan Bearer', async () => {
        const next = jest.fn();

        await authentication(buatReq('Basic abcdef'), {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unauthorized' })
        );
    });

    it('menolak jika setelah Bearer hanya spasi', async () => {
        const next = jest.fn();

        await authentication(buatReq('Bearer    '), {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unauthorized' })
        );
    });

    it('menolak token yang berformat ngawur', async () => {
        const next = jest.fn();

        await authentication(buatReq('Bearer token.palsu.ngawur'), {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unauthorized' })
        );
    });

    it('menolak token yang ditandatangani secret lain', async () => {
        const token = jwt.sign({ id: 1, telegramId: 123 }, 'secret-penyerang', { expiresIn: '7d' });
        const next = jest.fn();

        await authentication(buatReq(`Bearer ${token}`), {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unauthorized' })
        );
    });

    it('menolak token sah yang user-nya sudah tidak ada di database', async () => {
        // Token ditandatangani untuk id yang tidak pernah dibuat di test ini.
        const token = signToken({ id: 99999, telegramId: 123456789 });
        const next = jest.fn();

        await authentication(buatReq(`Bearer ${token}`), {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Unauthorized' })
        );
    });

    it('memakai pesan yang sama untuk semua penolakan agar tidak membocorkan keadaan', async () => {
        const pesan = [];
        for (const header of [undefined, 'Basic abc', 'Bearer ngawur']) {
            const next = jest.fn();
            await authentication(buatReq(header), {}, next);
            pesan.push(next.mock.calls[0][0].message);
        }

        expect(new Set(pesan).size).toBe(1);
    });
});

describe('authentication - permintaan yang diterima', () => {
    it('mengisi req.user dan meneruskan tanpa error', async () => {
        const user = await User.create({ telegramId: 123456789 });
        const token = signToken({ id: user.id, telegramId: user.telegramId });
        const req = buatReq(`Bearer ${token}`);
        const next = jest.fn();

        await authentication(req, {}, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(user.id);
    });

    it('mengambil user dari database, bukan dari isi token', async () => {
        const user = await User.create({ telegramId: 987654321, timezone: 'Asia/Makassar' });
        const token = signToken({ id: user.id, telegramId: user.telegramId });
        const req = buatReq(`Bearer ${token}`);
        const next = jest.fn();

        await authentication(req, {}, next);


        expect(req.user.timezone).toBe('Asia/Makassar');
        expect(typeof req.user.save).toBe('function');
    });

    it('menerima token yang dicari lewat primary key, bukan lewat email', async () => {

        const korban = await User.create({ telegramId: 111111111 });
        const penyerang = await User.create({ telegramId: 222222222 });
        const token = signToken({ id: penyerang.id, telegramId: penyerang.telegramId });
        const req = buatReq(`Bearer ${token}`);
        const next = jest.fn();

        await authentication(req, {}, next);

        expect(req.user.id).toBe(penyerang.id);
        expect(req.user.id).not.toBe(korban.id);
    });
});