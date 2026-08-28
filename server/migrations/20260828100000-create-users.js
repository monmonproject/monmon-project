module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      telegramId: { type: Sequelize.BIGINT, allowNull: false, unique: true },
      username: { type: Sequelize.STRING, allowNull: true },
      name: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true, unique: true },
      password: { type: Sequelize.STRING, allowNull: true },
      trialStartedAt: { type: Sequelize.DATE, allowNull: true },
      trialEndsAt: { type: Sequelize.DATE, allowNull: true },
      timezone: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Asia/Jakarta' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Users');
  },
};