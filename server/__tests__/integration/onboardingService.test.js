const OnboardingService = require('../../services/onboardingService');
const { TRIAL_DAYS } = require('../../config/constants');
const { User, Wallet, Category } = require('../../models');

describe('onboardingService (Postgres test asli)', () => {
  const now = new Date('2026-08-26T10:00:00Z');
  const fullProfile = { id: 123456789, first_name: 'Budi', last_name: 'Santoso', username: 'budi' };

  describe('registerNewUser', () => {
    it('mengisi trialStartedAt = now dan trialEndsAt = now + TRIAL_DAYS', async () => {
      const user = await OnboardingService.registerNewUser(fullProfile, now);

      const expectedTrialEnd = new Date(now);
      expectedTrialEnd.setDate(expectedTrialEnd.getDate() + TRIAL_DAYS);

      const savedUser = await User.findByPk(user.id);
      expect(savedUser.trialStartedAt).toEqual(now);
      expect(savedUser.trialEndsAt).toEqual(expectedTrialEnd);
      expect(savedUser.timezone).toBe('Asia/Jakarta');
    });

    it('tidak mengubah objek now milik pemanggil', async () => {
      const callerNow = new Date(now);

      await OnboardingService.registerNewUser(fullProfile, callerNow);

      expect(callerNow).toEqual(now);
    });

    it('membuat Wallet "Dompet Utama" dan 12 kategori default (8 expense, 4 income)', async () => {
      const user = await OnboardingService.registerNewUser(fullProfile, now);

      const wallets = await Wallet.findAll({ where: { UserId: user.id } });
      expect(wallets).toHaveLength(1);
      expect(wallets[0].name).toBe('Dompet Utama');

      const categories = await Category.findAll({ where: { WalletId: wallets[0].id } });
      expect(categories).toHaveLength(12);
      expect(categories.filter((category) => category.type === 'expense')).toHaveLength(8);
      expect(categories.filter((category) => category.type === 'income')).toHaveLength(4);
      expect(categories.every((category) => category.isDefault === true)).toBe(true);
    });

    it('menggabungkan first_name dan last_name jadi name, menyimpan username', async () => {
      const user = await OnboardingService.registerNewUser(fullProfile, now);

      const savedUser = await User.findByPk(user.id);
      expect(String(savedUser.telegramId)).toBe('123456789');
      expect(savedUser.name).toBe('Budi Santoso');
      expect(savedUser.username).toBe('budi');
    });

    it('profil tanpa last_name → name hanya first_name', async () => {
      const user = await OnboardingService.registerNewUser({ id: 111, first_name: 'Budi' }, now);

      const savedUser = await User.findByPk(user.id);
      expect(savedUser.name).toBe('Budi');
    });

    it('profil tanpa username → username null', async () => {
      const user = await OnboardingService.registerNewUser({ id: 222, first_name: 'Budi' }, now);

      const savedUser = await User.findByPk(user.id);
      expect(savedUser.username).toBeNull();
    });

    it('profil tanpa first_name dan last_name → name null, bukan string kosong', async () => {
      const user = await OnboardingService.registerNewUser({ id: 333 }, now);

      const savedUser = await User.findByPk(user.id);
      expect(savedUser.name).toBeNull();
    });
  });

  describe('findByTelegramId', () => {
    it('mengembalikan user yang telegramId-nya cocok', async () => {
      const user = await OnboardingService.registerNewUser(fullProfile, now);

      const foundUser = await OnboardingService.findByTelegramId(123456789);

      expect(foundUser).not.toBeNull();
      expect(foundUser.id).toBe(user.id);
    });

    it('mengembalikan null kalau telegramId belum terdaftar', async () => {
      const foundUser = await OnboardingService.findByTelegramId(999999999);

      expect(foundUser).toBeNull();
    });
  });
});
