const OnboardingService = require('../../services/onboardingService');
const { TRIAL_DAYS } = require('../../config/constants');
const { User, Wallet, Category } = require('../../models');

// Ditulis langsung dari ERD.md §5, SENGAJA tidak di-import dari
// config/defaultCategories.js: kalau di-import, salah ketik di sana tidak
// akan pernah tertangkap test ini.
const EXPECTED_DEFAULT_CATEGORIES = [
  { name: 'Makanan', type: 'expense' },
  { name: 'Transportasi', type: 'expense' },
  { name: 'Belanja', type: 'expense' },
  { name: 'Tagihan', type: 'expense' },
  { name: 'Kesehatan', type: 'expense' },
  { name: 'Hiburan', type: 'expense' },
  { name: 'Pendidikan', type: 'expense' },
  { name: 'Lainnya', type: 'expense' },
  { name: 'Gaji', type: 'income' },
  { name: 'Bonus', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Lainnya', type: 'income' },
];

function sortByTypeAndName(categories) {
  return [...categories].sort((first, second) => {
    const firstKey = `${first.type}:${first.name}`;
    const secondKey = `${second.type}:${second.name}`;
    return firstKey.localeCompare(secondKey);
  });
}

describe('onboardingService (Postgres test asli)', () => {
  const now = new Date('2026-08-26T10:00:00Z');
  const fullProfile = { id: 123456789, first_name: 'Budi', last_name: 'Santoso', username: 'budi' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerNewUser — transaksi, rollback penuh (issue #36)', () => {
    it('Category.bulkCreate gagal → User TIDAK tersimpan', async () => {
      jest.spyOn(Category, 'bulkCreate').mockRejectedValueOnce(new Error('bulkCreate gagal (simulasi)'));

      await expect(OnboardingService.registerNewUser(fullProfile, now)).rejects.toThrow();

      expect(await User.count()).toBe(0);
    });

    it('Category.bulkCreate gagal → Wallet TIDAK tersimpan', async () => {
      jest.spyOn(Category, 'bulkCreate').mockRejectedValueOnce(new Error('bulkCreate gagal (simulasi)'));

      await expect(OnboardingService.registerNewUser(fullProfile, now)).rejects.toThrow();

      expect(await Wallet.count()).toBe(0);
    });

    it('Wallet.create gagal → User TIDAK tersimpan (rollback di langkah mana pun)', async () => {
      jest.spyOn(Wallet, 'create').mockRejectedValueOnce(new Error('Wallet.create gagal (simulasi)'));

      await expect(OnboardingService.registerNewUser(fullProfile, now)).rejects.toThrow();

      expect(await User.count()).toBe(0);
      expect(await Category.count()).toBe(0);
    });

    it('melempar error aslinya ke pemanggil, tidak ditelan', async () => {
      const failure = new Error('bulkCreate gagal (simulasi)');
      jest.spyOn(Category, 'bulkCreate').mockRejectedValueOnce(failure);

      await expect(OnboardingService.registerNewUser(fullProfile, now)).rejects.toBe(failure);
    });

    it('setelah percobaan gagal, /start berikutnya dengan profil yang sama berhasil penuh', async () => {
      jest.spyOn(Category, 'bulkCreate').mockRejectedValueOnce(new Error('bulkCreate gagal (simulasi)'));
      await expect(OnboardingService.registerNewUser(fullProfile, now)).rejects.toThrow();

      await OnboardingService.registerNewUser(fullProfile, now);

      expect(await User.count()).toBe(1);
      expect(await Wallet.count()).toBe(1);
      expect(await Category.count()).toBe(12);
    });
  });

  describe('registerNewUser — jalur sukses', () => {
    it('menghasilkan tepat 1 User, 1 Wallet, dan 12 kategori di seluruh tabel', async () => {
      await OnboardingService.registerNewUser(fullProfile, now);

      expect(await User.count()).toBe(1);
      expect(await Wallet.count()).toBe(1);
      expect(await Category.count()).toBe(12);
    });

    it('nama dan tipe 12 kategori persis sesuai ERD.md §5', async () => {
      const user = await OnboardingService.registerNewUser(fullProfile, now);
      const wallet = await Wallet.findOne({ where: { UserId: user.id } });

      const categories = await Category.findAll({ where: { WalletId: wallet.id } });
      const savedCategories = categories.map((category) => ({ name: category.name, type: category.type }));

      expect(sortByTypeAndName(savedCategories)).toEqual(sortByTypeAndName(EXPECTED_DEFAULT_CATEGORIES));
    });
  });

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
