const { TRIAL_DAYS } = require('../config/constants');
const { DEFAULT_CATEGORIES } = require('../config/defaultCategories');
const { sequelize, User, Wallet, Category } = require('../models');

class OnboardingService {
  // now: Date — diterima sebagai parameter, bukan new Date() di dalam
  //
  // User + Wallet + kategori dibuat dalam SATU transaksi. Kalau satu langkah
  // gagal, semuanya di-rollback: user setengah jadi akan ditemukan oleh
  // /start berikutnya dan tidak pernah didaftarkan ulang (issue #36).
  // `transaction` wajib diteruskan ke tiap query, project ini tidak memakai CLS.
  static async registerNewUser(telegramProfile, now) {
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return sequelize.transaction(async (transaction) => {
      const user = await User.create({
        telegramId: telegramProfile.id,
        username: telegramProfile.username || null,
        name: [telegramProfile.first_name, telegramProfile.last_name].filter(Boolean).join(' ') || null,
        trialStartedAt: now,
        trialEndsAt,
        timezone: 'Asia/Jakarta',
      }, { transaction });

      const wallet = await Wallet.create({
        name: 'Dompet Utama',
        UserId: user.id,
      }, { transaction });

      await Category.bulkCreate(
        DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          WalletId: wallet.id,
          isDefault: true,
        })),
        { transaction }
      );

      return user;
    });
  }

  static async findByTelegramId(telegramId) {
    return User.findOne({ where: { telegramId } });
  }
}

module.exports = OnboardingService;