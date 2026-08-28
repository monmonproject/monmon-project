module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "CREATE TYPE \"enum_Categories_type\" AS ENUM ('income', 'expense');"
    );

    await queryInterface.createTable('Categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.ENUM('income', 'expense'), allowNull: false },
      isDefault: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      WalletId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Wallets', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Categories', ['WalletId', 'name', 'type'], {
      unique: true,
      name: 'categories_wallet_name_type_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Categories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Categories_type";');
  },
};