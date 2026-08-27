const EntitlementService = require('../../services/entitlementService');

describe('entitlementService', () => {
    const now = new Date('2026-08-26T10:00:00Z');

    describe('resolve', () => {
        it('mengembalikan member kalau ada subscription aktif dan belum expired', () => {
            const user = { trialEndsAt: new Date('2026-08-20T00:00:00Z') };
            const subscription = { status: 'active', expiresAt: new Date('2026-09-01T00:00:00Z') };

            const tier = EntitlementService.resolve(user, subscription, now);

            expect(tier).toBe('member');
        });

        it('mengembalikan member walaupun trial masih berjalan, kalau subscription aktif', () => {
            const user = { trialEndsAt: new Date('2026-09-01T00:00:00Z') };
            const subscription = { status: 'active', expiresAt: new Date('2026-09-10T00:00:00Z') };

            const tier = EntitlementService.resolve(user, subscription, now);

            expect(tier).toBe('member');
        });

        it('mengembalikan trial kalau tidak ada subscription aktif tapi trial belum lewat', () => {
            const user = { trialEndsAt: new Date('2026-08-31T00:00:00Z') };

            const tier = EntitlementService.resolve(user, null, now);

            expect(tier).toBe('trial');
        });

        it('mengembalikan free kalau trial sudah lewat dan tidak ada subscription aktif', () => {
            const user = { trialEndsAt: new Date('2026-08-20T00:00:00Z') };

            const tier = EntitlementService.resolve(user, null, now);

            expect(tier).toBe('free');
        });

        it('mengembalikan free kalau subscription ada tapi statusnya bukan active', () => {
            const user = { trialEndsAt: new Date('2026-08-20T00:00:00Z') };
            const subscription = { status: 'expired', expiresAt: new Date('2026-09-01T00:00:00Z') };

            const tier = EntitlementService.resolve(user, subscription, now);

            expect(tier).toBe('free');
        });

        it('mengembalikan free kalau subscription active tapi expiresAt sudah lewat', () => {
            const user = { trialEndsAt: new Date('2026-08-20T00:00:00Z') };
            const subscription = { status: 'active', expiresAt: new Date('2026-08-25T00:00:00Z') };

            const tier = EntitlementService.resolve(user, subscription, now);

            expect(tier).toBe('free');
        });

        it('mengembalikan free kalau trialEndsAt persis sama dengan now (bukan strictly before)', () => {
            const user = { trialEndsAt: now };

            const tier = EntitlementService.resolve(user, null, now);

            expect(tier).toBe('free');
        });
    });

    describe('can', () => {
        it('tier trial bisa akses ai.analysis', () => {
            expect(EntitlementService.can('trial', 'ai.analysis')).toBe(true);
        });

        it('tier member bisa akses record.voice', () => {
            expect(EntitlementService.can('member', 'record.voice')).toBe(true);
        });

        it('tier free TIDAK bisa akses ai.analysis', () => {
            expect(EntitlementService.can('free', 'ai.analysis')).toBe(false);
        });

        it('tier free TIDAK bisa akses record.voice (pagar biaya AI)', () => {
            expect(EntitlementService.can('free', 'record.voice')).toBe(false);
        });

        it('tier free TIDAK bisa akses record.photo (pagar biaya AI)', () => {
            expect(EntitlementService.can('free', 'record.photo')).toBe(false);
        });

        it('tier free bisa akses record.text', () => {
            expect(EntitlementService.can('free', 'record.text')).toBe(true);
        });

        it('tier free TIDAK bisa akses dashboard.read', () => {
            expect(EntitlementService.can('free', 'dashboard.read')).toBe(false);
        });
    });
});