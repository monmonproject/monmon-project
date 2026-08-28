const express = require('express');
const errorHandler = require('./middlewares/errorHandler');
const webhookRoutes = require('./routes/webhook');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'OK' });
});

app.use('/webhook', webhookRoutes);

app.use(errorHandler);

module.exports = app;