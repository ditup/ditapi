'use strict';

module.exports = {
  database: {
    host: '127.0.0.1',
    port: 8529,
    database: 'ditup-dev',
    username: 'ditup-dev'
  },
  url: {
    protocol: 'https',
    host: 'ditup.org',
    path: '/api',
    get all() {
      return `${this.protocol}://${this.host}${this.path}`;
    }
  },
  security: {
    // iterations for pbkdf2 hashing of passwords
    iterations: 10000
  }
};
