module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      WalletId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Wallets', key: 'id' },
        onDelete: 'RESTRICT',
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'RESTRICT',
      },
      CategoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Categories', key: 'id' },
        onDelete: 'SET NULL',
      },
      type: { type: Sequelize.STRING, allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      note: { type: Sequelize.STRING, allowNull: true },
      source: { type: Sequelize.STRING, allowNull: false },
      parseMode: { type: Sequelize.STRING, allowNull: false },
      rawMessage: { type: Sequelize.TEXT, allowNull: true },
      aiConfidence: { type: Sequelize.FLOAT, allowNull: true },
      correctsId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Transactions', key: 'id' },
        onDelete: 'RESTRICT',
      },
      occurredAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "Transactions"
        ADD CONSTRAINT transactions_amount_positive
          CHECK ("amount" > 0),
        ADD CONSTRAINT transactions_type_valid
          CHECK ("type" IN ('income', 'expense', 'correction')),
        ADD CONSTRAINT transactions_correction_has_corrects_id
          CHECK ("type" <> 'correction' OR "correctsId" IS NOT NULL),
        ADD CONSTRAINT transactions_parse_mode_valid
          CHECK ("parseMode" IN ('ai', 'rule', 'manual')),
        ADD CONSTRAINT transactions_ai_confidence_range
          CHECK ("aiConfidence" IS NULL OR "aiConfidence" BETWEEN 0 AND 1);
    `);

    await queryInterface.addIndex('Transactions', ['WalletId', { name: 'occurredAt', order: 'DESC' }], {
      name: 'transactions_wallet_occurred_at',
    });
    await queryInterface.addIndex('Transactions', ['WalletId', 'CategoryId', 'occurredAt'], {
      name: 'transactions_wallet_category_occurred_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Transactions');
  },
};
