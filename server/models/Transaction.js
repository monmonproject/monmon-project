module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define(
    'Transaction',
    {
      WalletId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'Dompet wajib diisi' },
        },
      },
      UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'Pengguna wajib diisi' },
        },
      },
      CategoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'Jenis transaksi wajib diisi' },
          isIn: {
            args: [['income', 'expense', 'correction']],
            msg: 'Jenis transaksi harus income, expense, atau correction',
          },
        },
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'Jumlah wajib diisi' },
          isInt: { msg: 'Jumlah harus bilangan bulat rupiah' },
          min: { args: [1], msg: 'Jumlah harus lebih dari nol' },
        },
      },
      note: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'Sumber transaksi wajib diisi' },
          isIn: {
            args: [['text', 'voice', 'photo', 'dashboard']],
            msg: 'Sumber transaksi harus text, voice, photo, atau dashboard',
          },
        },
      },
      parseMode: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: 'Mode parsing wajib diisi' },
          isIn: {
            args: [['ai', 'rule', 'manual']],
            msg: 'Mode parsing harus ai, rule, atau manual',
          },
        },
      },
      rawMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      aiConfidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          min: { args: [0], msg: 'Confidence AI minimal 0' },
          max: { args: [1], msg: 'Confidence AI maksimal 1' },
        },
      },
      correctsId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      occurredAt: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: { msg: 'Tanggal transaksi wajib diisi' },
        },
      },
    },
    {
      validate: {
        correctionMustHaveCorrectsId() {
          const isMissingCorrectsId = this.correctsId === null || this.correctsId === undefined;
          if (this.type === 'correction' && isMissingCorrectsId) {
            throw new Error('Koreksi harus merujuk transaksi yang dikoreksi');
          }
        },
      },
    }
  );

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Wallet, { foreignKey: 'WalletId' });
    Transaction.belongsTo(models.Category, { foreignKey: 'CategoryId' });
    Transaction.belongsTo(models.User, { foreignKey: 'UserId' });
  };

  return Transaction;
};
