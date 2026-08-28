module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define('Wallet', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Dompet Utama',
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  Wallet.associate = (models) => {
    Wallet.belongsTo(models.User, { foreignKey: 'UserId' });
    Wallet.hasMany(models.Category, { foreignKey: 'WalletId' });
  };

  return Wallet;
};