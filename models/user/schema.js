'use strict';

const account = require('./account');

module.exports = async function (user) {
  const password = await account.hash(user.password);
  const code = await account.hash(user.emailVerifyCode);

  return {
    username: user.username,
    email: null,
    password,
    account: {
      email: {
        temporary: user.email,
        code,
        codeExpire: Date.now() + 2 * 3600 * 1000 // in 2 hours
      }
    },
    profile: {
      givenName: '',
      familyName: '',
      description: ''
    },
    created: Date.now()
  };
};
