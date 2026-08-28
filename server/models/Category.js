module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    WalletId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  Category.associate = (models) => {
    Category.belongsTo(models.Wallet, { foreignKey: 'WalletId' });
  };

  return Category;
};