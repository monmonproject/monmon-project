require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const base = {
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: {
    ...base,
    url: process.env.DATABASE_URL,
  },
  test: {
    ...base,
    url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL?.replace('_dev', '_test'),
  },
  production: {
    ...base,
    url: process.env.DATABASE_URL,
  },
};