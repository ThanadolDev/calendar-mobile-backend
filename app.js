const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/error');
const routes = require('./routes/calendarRoutes.js');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/calendar', routes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    version: process.env.npm_package_version
  });
});

app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

module.exports = app;