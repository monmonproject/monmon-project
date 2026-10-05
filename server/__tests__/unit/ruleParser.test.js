const fs = require('fs');
const path = require('path');
const RuleParser = require('../../ai/ruleParser');

describe('ruleParser', () => {
    const now = new Date('2026-08-26T10:00:00Z');

    describe('parse — satu transaksi', () => {
        it('"makan siang 35rb" → 1 transaksi expense 35000', () => {
            const result = RuleParser.parse('makan siang 35rb', now);

            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0]).toEqual({
                type: 'expense',
                amount: 35000,
                categoryName: null,
                note: 'makan siang',
                occurredAt: '2026-08-26',
            });
        });

        it('"35.000 makan siang" → angka di depan juga terbaca', () => {
            const result = RuleParser.parse('35.000 makan siang', now);

            expect(result.transactions).toHaveLength(1);
            expect(result.transactions[0].amount).toBe(35000);
            expect(result.transactions[0].note).toBe('makan siang');
        });

        it('"beli 2 kopi 25rb" → amount 25000, bukan 2', () => {
            const result = RuleParser.parse('beli 2 kopi 25rb', now);

            expect(result.transactions[0].amount).toBe(25000);
            expect(result.transactions[0].note).toBe('beli 2 kopi');
        });

        it('note dirapikan: spasi berlebih dibuang', () => {
            const result = RuleParser.parse('  makan   35rb   siang  ', now);

            expect(result.transactions[0].note).toBe('makan siang');
        });
    });

    describe('parse — deteksi income lewat kata kunci utuh', () => {
        it('"gaji masuk 8jt" → income', () => {
            const result = RuleParser.parse('gaji masuk 8jt', now);

            expect(result.transactions[0].type).toBe('income');
            expect(result.transactions[0].amount).toBe(8000000);
        });

        it('"bonus 500rb" → income', () => {
            expect(RuleParser.parse('bonus 500rb', now).transactions[0].type).toBe('income');
        });

        it('"terima transfer 1jt" → income', () => {
            expect(RuleParser.parse('terima transfer 1jt', now).transactions[0].type).toBe('income');
        });

        it('kata kunci tidak peka huruf besar: "GAJI 8jt" → income', () => {
            expect(RuleParser.parse('GAJI 8jt', now).transactions[0].type).toBe('income');
        });

        it('"pemasukan 100rb" → expense (mengandung "masuk" tapi bukan kata utuh)', () => {
            expect(RuleParser.parse('pemasukan 100rb', now).transactions[0].type).toBe('expense');
        });

        it('"gajian 50rb" → expense (mengandung "gaji" tapi bukan kata utuh)', () => {
            expect(RuleParser.parse('gajian 50rb', now).transactions[0].type).toBe('expense');
        });
    });

    describe('parse — input tanpa angka', () => {
        it('transactions kosong (array panjang 0)', () => {
            const result = RuleParser.parse('makan siang', now);

            expect(result.transactions).toEqual([]);
            expect(result.confidence).toBeNull();
        });
    });

    describe('parse — kontrak output (ARCHITECTURE.md §4)', () => {
        it('confidence selalu null', () => {
            expect(RuleParser.parse('makan siang 35rb', now).confidence).toBeNull();
        });

        it('bentuk objek persis: hanya type, amount, categoryName, note, occurredAt', () => {
            const result = RuleParser.parse('gaji masuk 8jt', now);

            expect(Object.keys(result).sort()).toEqual(['confidence', 'transactions']);
            expect(Object.keys(result.transactions[0]).sort()).toEqual(
                ['amount', 'categoryName', 'note', 'occurredAt', 'type'],
            );
        });

        it('categoryName selalu null (rule parser tidak mengkategorikan)', () => {
            expect(RuleParser.parse('makan siang 35rb', now).transactions[0].categoryName).toBeNull();
            expect(RuleParser.parse('gaji masuk 8jt', now).transactions[0].categoryName).toBeNull();
        });
    });

    describe('parse — occurredAt mengikuti zona waktu user', () => {
        // 2026-08-25T19:00:00Z = 26 Agustus pukul 02:00 WIB
        const earlyMorningWib = new Date('2026-08-25T19:00:00Z');

        it('default Asia/Jakarta: jam 2 pagi WIB tetap tercatat hari itu', () => {
            const result = RuleParser.parse('makan 35rb', earlyMorningWib);

            expect(result.transactions[0].occurredAt).toBe('2026-08-26');
        });

        it('timezone eksplisit UTC: momen yang sama tercatat tanggal 25', () => {
            const result = RuleParser.parse('makan 35rb', earlyMorningWib, 'UTC');

            expect(result.transactions[0].occurredAt).toBe('2026-08-25');
        });

        it('"kemarin" TIDAK diproses: occurredAt tetap tanggal now', () => {
            const result = RuleParser.parse('bensin 50k kemarin', now);

            expect(result.transactions[0].occurredAt).toBe('2026-08-26');
        });
    });

    describe('pagar biaya AI (SPEC.md §5 no. 3)', () => {
        const source = fs.readFileSync(path.join(__dirname, '../../ai/ruleParser.js'), 'utf8');

        it('ruleParser.js tidak meng-import aiClient sama sekali', () => {
            expect(source).not.toMatch(/aiClient/);
        });

        it('ruleParser.js tidak mengakses database (tidak meng-import models)', () => {
            expect(source).not.toMatch(/require\(['"][^'"]*models/);
        });
    });
});
