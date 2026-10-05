const { parseAmount, extractAmount } = require('../../helpers/money');

describe('money', () => {
    describe('parseAmount — normalisasi suffix (SPEC.md §8)', () => {
        it('"35rb" → 35000 (rb ×1.000)', () => {
            expect(parseAmount('35rb')).toBe(35000);
        });

        it('"35 ribu" → 35000 (ribu ×1.000, boleh ada spasi)', () => {
            expect(parseAmount('35 ribu')).toBe(35000);
        });

        it('"50k" → 50000 (k ×1.000)', () => {
            expect(parseAmount('50k')).toBe(50000);
        });

        it('"8jt" → 8000000 (jt ×1.000.000)', () => {
            expect(parseAmount('8jt')).toBe(8000000);
        });

        it('"8 juta" → 8000000 (juta ×1.000.000, boleh ada spasi)', () => {
            expect(parseAmount('8 juta')).toBe(8000000);
        });

        it('suffix tidak peka huruf besar: "35RB" → 35000', () => {
            expect(parseAmount('35RB')).toBe(35000);
        });
    });

    describe('parseAmount — pemisah ribuan dibuang (SPEC.md §8)', () => {
        it('"35.000" → 35000 (titik pemisah ribuan dibuang)', () => {
            expect(parseAmount('35.000')).toBe(35000);
        });

        it('"35,000" → 35000 (koma pemisah ribuan dibuang)', () => {
            expect(parseAmount('35,000')).toBe(35000);
        });

        it('"1.500.000" → 1500000 (pemisah ribuan lebih dari satu)', () => {
            expect(parseAmount('1.500.000')).toBe(1500000);
        });

        it('"35000" → 35000 (angka polos)', () => {
            expect(parseAmount('35000')).toBe(35000);
        });
    });

    describe('parseAmount — desimal dengan suffix (bukan pemisah ribuan)', () => {
        it('"1,5jt" → 1500000, bukan 15000000', () => {
            expect(parseAmount('1,5jt')).toBe(1500000);
        });

        it('"1.5jt" → 1500000, bukan 15000000', () => {
            expect(parseAmount('1.5jt')).toBe(1500000);
        });

        it('"2,25jt" → 2250000 (dua digit desimal)', () => {
            expect(parseAmount('2,25jt')).toBe(2250000);
        });

        it('"2,5rb" → 2500', () => {
            expect(parseAmount('2,5rb')).toBe(2500);
        });

        it('"1.500rb" → 1500000 (3 digit setelah pemisah tetap pemisah ribuan)', () => {
            expect(parseAmount('1.500rb')).toBe(1500000);
        });
    });

    describe('parseAmount — angka di dalam kalimat', () => {
        it('"makan siang 35rb" → 35000', () => {
            expect(parseAmount('makan siang 35rb')).toBe(35000);
        });

        it('"beli 2 kopi 25rb" → 25000 (angka ber-suffix diprioritaskan)', () => {
            expect(parseAmount('beli 2 kopi 25rb')).toBe(25000);
        });

        it('"beli 2 kopi 25.000" → 25000 (angka berpemisah ribuan diprioritaskan)', () => {
            expect(parseAmount('beli 2 kopi 25.000')).toBe(25000);
        });

        it('"parkir 2000 tadi" → 2000 (tanpa suffix/pemisah, angka pertama diambil)', () => {
            expect(parseAmount('parkir 2000 tadi')).toBe(2000);
        });
    });

    describe('parseAmount — hasil selalu integer (SPEC.md §5 no. 6)', () => {
        const inputs = ['35rb', '35 ribu', '50k', '8jt', '8 juta', '35.000', '35,000', '35000', '1,5jt', '2,25jt', '2,5rb'];

        it.each(inputs)('"%s" menghasilkan integer, bukan float', (input) => {
            expect(Number.isInteger(parseAmount(input))).toBe(true);
        });
    });

    describe('parseAmount — input tidak valid', () => {
        it('input tanpa angka → null', () => {
            expect(parseAmount('makan siang')).toBeNull();
        });

        it('string kosong → null', () => {
            expect(parseAmount('')).toBeNull();
        });

        it('nominal nol "0rb" → null (amount wajib > 0, ERD.md §3)', () => {
            expect(parseAmount('0rb')).toBeNull();
        });
    });

    describe('extractAmount', () => {
        it('mengembalikan amount dan teks angka yang cocok', () => {
            expect(extractAmount('makan siang 35rb')).toEqual({ amount: 35000, matchedText: '35rb' });
        });

        it('matchedText ikut spasi antara angka dan suffix', () => {
            expect(extractAmount('gaji 8 juta')).toEqual({ amount: 8000000, matchedText: '8 juta' });
        });

        it('matchedText menunjuk angka yang diprioritaskan, bukan angka pertama', () => {
            expect(extractAmount('beli 2 kopi 25rb')).toEqual({ amount: 25000, matchedText: '25rb' });
        });

        it('input tanpa angka → null', () => {
            expect(extractAmount('makan siang')).toBeNull();
        });
    });
});
