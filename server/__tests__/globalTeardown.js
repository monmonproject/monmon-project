module.exports = async () => {
  const { sequelize } = require('../models');
  await sequelize.close();
};