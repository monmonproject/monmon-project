const { TRIAL_DAYS } = require('../config/constants');
const { DEFAULT_CATEGORIES } = require('../config/defaultCategories');
const { User, Wallet, Category } = require('../models');

class OnboardingService {
  // now: Date — diterima sebagai parameter, bukan new Date() di dalam
  static async registerNewUser(telegramProfile, now) {
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const user = await User.create({
      telegramId: telegramProfile.id,
      username: telegramProfile.username || null,
      name: [telegramProfile.first_name, telegramProfile.last_name].filter(Boolean).join(' ') || null,
      trialStartedAt: now,
      trialEndsAt,
      timezone: 'Asia/Jakarta',
    });

    const wallet = await Wallet.create({
      name: 'Dompet Utama',
      UserId: user.id,
    });

    await Category.bulkCreate(
      DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        WalletId: wallet.id,
        isDefault: true,
      }))
    );

    return user;
  }

  static async findByTelegramId(telegramId) {
    return User.findOne({ where: { telegramId } });
  }
}

module.exports = OnboardingService;