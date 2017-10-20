'use strict';

module.exports = {
  // the url where the API lives
  url: {
    all: 'https://ditup.org/api'
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
  // when can unverified users be deleted
  unverifiedUsersTTL: 24 * 3600 * 1000, // 1 day in milliseconds
  // when should email-verification code expire
  emailVerificationCodeExpire: 2 * 3600 * 1000, // 2 hours in milliseconds
  // when should reset-password code expire
  resetPasswordCodeExpire: 30 * 60 * 1000, // 30 minutes in milliseconds
  // options for CORS (Cross Origin Resource Sharing)
  cors: {
    // a whitelist of Origin domains
    origin: [],
    // allowed methods
    methods: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST'],
    // allowed headers
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};
