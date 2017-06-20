'use strict';

module.exports = {
  // arangodb database info
  database: {
    host: '127.0.0.1',
    port: 8529,
    database: 'ditup-dev',
    username: 'ditup-dev'
  },
  // the url where the API lives
  url: {
    protocol: 'https',
    host: 'ditup.org',
    path: '/api',
    get all() {
      return `${this.protocol}://${this.host}${this.path}`;
    }
  },
  // the url where the app lives
  appUrl: {
    all: 'https://ditup.org',
    verifyEmail: (username, code) => `/user/${username}/verify-email/${code}`,
    resetPassword: (username, code) => `/reset-password/${username}/${code}`
  },
  // password hashing and other
  security: {
    // iterations for pbkdf2 hashing of passwords
    iterations: 10000
  },
  // randomization of user's location
  randomLocationOffset: {
    min: 1000, // meters
    max: 2000 // meters
  },
  // how long should unverified users exist before being deleted
  unverifiedUsersTTL: 24 * 3600 * 1000, // 1 day in milliseconds
  emailVerificationCodeExpire: 2 * 3600 * 1000 // 2 hours in milliseconds
};
