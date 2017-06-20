'use strict';

const account = require('./account');
const path = require('path');
const config = require(path.resolve('./config'));

module.exports = async function (user) {
  const password = await account.hash(user.password);

  return {
    username: user.username,
    email: null,
    password,
    account: {
      email: await module.exports.account.email(user)
    },
    profile: {
      givenName: '',
      familyName: '',
      description: ''
    },
    created: Date.now()
  };
};

module.exports.account = {
  async email({ email, emailVerifyCode }) {
    const code = await account.hash(emailVerifyCode);
    return {
      temporary: email,
      code,
      codeExpire: Date.now() + config.emailVerificationCodeExpire
    };
  }
};
