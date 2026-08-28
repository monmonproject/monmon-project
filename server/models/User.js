module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    telegramId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    trialStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Asia/Jakarta',
    },
  });

  User.associate = (models) => {
    User.hasMany(models.Wallet, { foreignKey: 'UserId' });
  };

  return User;
};