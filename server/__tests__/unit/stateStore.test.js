const stateStore = require('../../services/stateStore');

// Waktu acuan tetap. Semua pergeseran waktu dihitung dari sini,
// jadi test tidak pernah bergantung pada jam sungguhan.
const T0 = new Date('2026-01-01T00:00:00.000Z');
const geser = (detik) => new Date(T0.getTime() + detik * 1000);

// Kunci dibuat unik per test supaya satu test tidak mewarisi
// isi Map dari test sebelumnya (Map-nya hidup selama proses Jest).
let nomor = 0;
const kunciBaru = () => `kunci-${++nomor}`;

describe('stateStore.set dan get', () => {
    it('mengembalikan nilai yang baru disimpan', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, { kode: '123456' }, 300, T0);

        expect(stateStore.get(kunci, T0)).toEqual({ kode: '123456' });
    });

    it('mengembalikan null untuk kunci yang tidak pernah ada', () => {
        expect(stateStore.get('kunci-tidak-ada', T0)).toBeNull();
    });

    it('masih berlaku satu detik sebelum kedaluwarsa', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, 'nilai', 300, T0);

        expect(stateStore.get(kunci, geser(299))).toBe('nilai');
    });

    it('sudah habis tepat pada detik kedaluwarsa', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, 'nilai', 300, T0);

        // Keputusan yang dikunci: tepat di expiresAt dianggap sudah lewat.
        expect(stateStore.get(kunci, geser(300))).toBeNull();
    });

    it('sudah habis setelah melewati kedaluwarsa', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, 'nilai', 300, T0);

        expect(stateStore.get(kunci, geser(301))).toBeNull();
    });

    it('tetap null kalau dibaca dua kali setelah kedaluwarsa', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, 'nilai', 60, T0);

        expect(stateStore.get(kunci, geser(120))).toBeNull();
        expect(stateStore.get(kunci, geser(120))).toBeNull();
    });

    it('menimpa nilai lama kalau kunci yang sama di-set ulang', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, 'lama', 300, T0);
        stateStore.set(kunci, 'baru', 300, T0);

        expect(stateStore.get(kunci, T0)).toBe('baru');
    });

    it('menyegarkan masa berlaku saat di-set ulang di waktu yang lebih baru', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, 'lama', 300, T0);
        stateStore.set(kunci, 'baru', 300, geser(200));

        // Dihitung dari set kedua, jadi di detik 400 masih hidup.
        expect(stateStore.get(kunci, geser(400))).toBe('baru');
    });

    it('memisahkan kunci yang berbeda', () => {
        const a = kunciBaru();
        const b = kunciBaru();
        stateStore.set(a, 'nilai-a', 300, T0);
        stateStore.set(b, 'nilai-b', 300, T0);

        expect(stateStore.get(a, T0)).toBe('nilai-a');
        expect(stateStore.get(b, T0)).toBe('nilai-b');
    });

    it('menerima nilai apa pun, bukan hanya objek OTP', () => {
        const kunci = kunciBaru();
        const nilai = { jenis: 'konfirmasi', transaksi: { amount: 50000 } };
        stateStore.set(kunci, nilai, 300, T0);

        expect(stateStore.get(kunci, T0)).toEqual(nilai);
    });

    it('menghormati ttl yang berbeda per kunci', () => {
        const pendek = kunciBaru();
        const panjang = kunciBaru();
        stateStore.set(pendek, 'pendek', 60, T0);
        stateStore.set(panjang, 'panjang', 600, T0);

        expect(stateStore.get(pendek, geser(120))).toBeNull();
        expect(stateStore.get(panjang, geser(120))).toBe('panjang');
    });
});

describe('stateStore.del', () => {
    it('menghapus entri yang ada', () => {
        const kunci = kunciBaru();
        stateStore.set(kunci, 'nilai', 300, T0);

        stateStore.del(kunci);

        expect(stateStore.get(kunci, T0)).toBeNull();
    });

    it('tidak melempar error untuk kunci yang tidak ada', () => {
        expect(() => stateStore.del('kunci-tidak-ada')).not.toThrow();
    });

    it('hanya menghapus kunci yang diminta', () => {
        const a = kunciBaru();
        const b = kunciBaru();
        stateStore.set(a, 'nilai-a', 300, T0);
        stateStore.set(b, 'nilai-b', 300, T0);

        stateStore.del(a);

        expect(stateStore.get(a, T0)).toBeNull();
        expect(stateStore.get(b, T0)).toBe('nilai-b');
    });
});