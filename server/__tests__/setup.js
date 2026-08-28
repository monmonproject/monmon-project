const { sequelize } = require('../models');

beforeAll(async () => {
  await sequelize.authenticate();
});

beforeEach(async () => {
  await sequelize.query('TRUNCATE "Categories", "Wallets", "Users" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await sequelize.close();
});