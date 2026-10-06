const jwt = require('jsonwebtoken');
const { signToken, verifyToken } = require('../../helpers/jwt');

const SECRET = 'rahasia-test';
const originalSecret = process.env.JWT_SECRET;

beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
});

afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
});

describe('signToken', () => {
    it('mengembalikan JWT tiga bagian', () => {
        const token = signToken({ id: 1, telegramId: 123456789 });
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3);
    });

    it('hanya memuat id dan telegramId, field lain dibuang', () => {
        const token = signToken({ id: 1, telegramId: 123456789, tier: 'member', role: 'admin' });
        const payload = jwt.verify(token, SECRET);
        expect(payload.id).toBe(1);
        expect(payload.telegramId).toBe(123456789);
        expect(payload.tier).toBeUndefined();
        expect(payload.role).toBeUndefined();
    });

    it('memasang masa berlaku 7 hari', () => {
        const token = signToken({ id: 1, telegramId: 123456789 });
        const { iat, exp } = jwt.verify(token, SECRET);
        expect(exp - iat).toBe(7 * 24 * 60 * 60);
    });

    it('menolak menandatangani jika JWT_SECRET tidak ada', () => {
        delete process.env.JWT_SECRET;
        expect(() => signToken({ id: 1, telegramId: 123456789 }))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('menolak menandatangani jika JWT_SECRET hanya spasi', () => {
        process.env.JWT_SECRET = '   ';
        expect(() => signToken({ id: 1, telegramId: 123456789 }))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });
});

describe('verifyToken', () => {
    it('mengembalikan payload untuk token yang sah', () => {
        const token = signToken({ id: 7, telegramId: 987654321 });
        const payload = verifyToken(token);
        expect(payload.id).toBe(7);
        expect(payload.telegramId).toBe(987654321);
    });

    it('melempar Unauthorized untuk token berformat ngawur', () => {
        expect(() => verifyToken('token.palsu.ngawur'))
            .toThrow(expect.objectContaining({ name: 'Unauthorized', message: 'Token tidak valid' }));
    });

    it('melempar Unauthorized untuk token yang ditandatangani secret lain', () => {
        const token = jwt.sign({ id: 1, telegramId: 123456789 }, 'secret-penyerang', { expiresIn: '7d' });
        expect(() => verifyToken(token))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('melempar Unauthorized untuk token yang sudah kedaluwarsa', () => {
        const token = jwt.sign({ id: 1, telegramId: 123456789 }, SECRET, { expiresIn: '-1s' });
        expect(() => verifyToken(token))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('melempar Unauthorized jika JWT_SECRET tidak ada', () => {
        const token = signToken({ id: 1, telegramId: 123456789 });
        delete process.env.JWT_SECRET;
        expect(() => verifyToken(token))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });
});