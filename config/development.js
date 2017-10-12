'use strict';

module.exports = {
  database: {
    host: '127.0.0.1',
    port: 8529,
    database: 'ditup-dev',
    username: 'ditup-dev'
  },
  url: {
    all: 'https://dev.ditup.org/api'
  },
  appUrl: {
    all: 'https://dev.ditup.org'
  },
  mailer: {
    host: '0.0.0.0',
    port: 25
  },
  cors: {
    origin: [
      'http://localhost:4200',
      'http://89.221.210.112:4200',
      'https://dev.ditup.org'
    ]
  }
};
