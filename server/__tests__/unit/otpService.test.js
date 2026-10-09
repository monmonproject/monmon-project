const crypto = require('crypto');
const otpService = require('../../services/otpService');
const { OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS } = require('../../config/constants');

const T0 = new Date('2026-01-01T00:00:00.000Z');
const geser = (detik) => new Date(T0.getTime() + detik * 1000);

// telegramId unik per test: stateStore hidup selama proses Jest,
// jadi test tidak boleh saling mewarisi entri.
let urutan = 0;
const idBaru = () => 500000000 + ++urutan;

afterEach(() => {
    jest.restoreAllMocks();
});

describe('generateOtp', () => {
    it('mengembalikan string enam angka', () => {
        const code = otpService.generateOtp(idBaru(), T0);

        expect(typeof code).toBe('string');
        expect(code).toMatch(/^\d{6}$/);
    });

    it('memakai crypto.randomInt, bukan Math.random', () => {
        const spy = jest.spyOn(crypto, 'randomInt');

        otpService.generateOtp(idBaru(), T0);

        expect(spy).toHaveBeenCalled();
    });

    it('melengkapi angka kecil dengan nol di depan', () => {
        jest.spyOn(crypto, 'randomInt').mockReturnValue(42);

        const code = otpService.generateOtp(idBaru(), T0);

        expect(code).toBe('000042');
    });

    it('membatalkan kode lama kalau diminta ulang', () => {
        const id = idBaru();
        const kodeLama = otpService.generateOtp(id, T0);
        otpService.generateOtp(id, T0);

        expect(() => otpService.verifyOtp(id, kodeLama, T0))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('mengembalikan hitungan percobaan ke nol saat diminta ulang', () => {
        const id = idBaru();
        otpService.generateOtp(id, T0);

        // Habiskan dua percobaan.
        for (let i = 0; i < 2; i++) {
            try { otpService.verifyOtp(id, '000000', T0); } catch (e) { /* diabaikan */ }
        }

        // Kode baru: jatah penuh lagi, jadi dua kali salah belum kena batas.
        const kodeBaru = otpService.generateOtp(id, T0);
        try { otpService.verifyOtp(id, '000000', T0); } catch (e) { /* diabaikan */ }
        try { otpService.verifyOtp(id, '000000', T0); } catch (e) { /* diabaikan */ }

        expect(otpService.verifyOtp(id, kodeBaru, T0)).toBe(true);
    });
});

describe('verifyOtp - berhasil', () => {
    it('mengembalikan true untuk kode yang benar', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);

        expect(otpService.verifyOtp(id, code, T0)).toBe(true);
    });

    it('hanya bisa dipakai sekali', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);

        otpService.verifyOtp(id, code, T0);

        expect(() => otpService.verifyOtp(id, code, T0))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('masih berlaku satu detik sebelum kedaluwarsa', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);

        expect(otpService.verifyOtp(id, code, geser(OTP_TTL_SECONDS - 1))).toBe(true);
    });

    it('tetap berhasil setelah beberapa kali salah tapi belum kena batas', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);

        try { otpService.verifyOtp(id, '000000', T0); } catch (e) { /* diabaikan */ }

        expect(otpService.verifyOtp(id, code, T0)).toBe(true);
    });
});

describe('verifyOtp - ditolak', () => {
    it('menolak kalau tidak pernah ada OTP untuk id itu', () => {
        expect(() => otpService.verifyOtp(idBaru(), '123456', T0))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('menolak kode yang salah', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);
        const salah = code === '000000' ? '111111' : '000000';

        expect(() => otpService.verifyOtp(id, salah, T0))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('menolak kode yang sudah kedaluwarsa', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);

        expect(() => otpService.verifyOtp(id, code, geser(OTP_TTL_SECONDS)))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });

    it('tidak menghitung kedaluwarsa sebagai percobaan gagal', () => {
        const id = idBaru();
        otpService.generateOtp(id, T0);

        // Dicoba berkali-kali setelah kedaluwarsa: tetap Unauthorized,
        // tidak pernah berubah jadi QuotaExceeded, karena entrinya sudah tidak ada.
        for (let i = 0; i < OTP_MAX_ATTEMPTS + 2; i++) {
            expect(() => otpService.verifyOtp(id, '000000', geser(OTP_TTL_SECONDS + i)))
                .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
        }
    });
    it('tidak memperpanjang umur OTP saat ada percobaan gagal', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);

        // Gagal sekali di tengah masa berlaku.
        try { otpService.verifyOtp(id, '000000', geser(100)); } catch (e) { /* diabaikan */ }

        // Batas aslinya tetap OTP_TTL_SECONDS dari T0, bukan dihitung ulang dari detik 100.
        expect(() => otpService.verifyOtp(id, code, geser(OTP_TTL_SECONDS)))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });
});

describe('verifyOtp - batas percobaan', () => {
    it('melempar QuotaExceeded pada percobaan salah ke-' + OTP_MAX_ATTEMPTS, () => {
        const id = idBaru();
        otpService.generateOtp(id, T0);

        // Percobaan 1 sampai MAX-1 masih Unauthorized.
        for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i++) {
            expect(() => otpService.verifyOtp(id, '000000', T0))
                .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
        }

        // Percobaan ke-MAX kena batas.
        expect(() => otpService.verifyOtp(id, '000000', T0))
            .toThrow(expect.objectContaining({ name: 'QuotaExceeded' }));
    });

    it('menghanguskan OTP setelah kena batas, walau kodenya benar', () => {
        const id = idBaru();
        const code = otpService.generateOtp(id, T0);

        for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
            try { otpService.verifyOtp(id, '000000', T0); } catch (e) { /* diabaikan */ }
        }

        expect(() => otpService.verifyOtp(id, code, T0))
            .toThrow(expect.objectContaining({ name: 'Unauthorized' }));
    });
});