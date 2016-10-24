'use strict';

module.exports = {
  database: {
    host: '127.0.0.1',
    port: 8529,
    database: 'ditup-dev',
    username: 'ditup-dev',
    password: ''
  },
  url: {
    protocol: 'http',
    host: 'localhost',
    path: '',
    get all() {
      return `${this.protocol}://${this.host}${this.path}`;
    }
  },
  mailer: {
    host: '0.0.0.0',
    port: 1025,
    ignoreTLS: true
  }
};
