'use strict';

const account = require('./account');

module.exports = async function (user) {
  let password = await account.hash(user.password);
  let code = await account.hash(user.emailVerifyCode);

  return {
    username: user.username,
    email: null,
    password: password,
    account: {
      email: {
        temporary: user.email,
        code: code,
        codeExpire: Date.now() + 2 * 3600 * 1000 // in 2 hours
      }
    },
    profile: {
      givenName: '',
      familyName: '',
      description: ''
    }
  };
};
