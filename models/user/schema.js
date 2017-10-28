'use strict';

const account = require('./account');
const helpers = require('./helpers');
const path = require('path');
const config = require(path.resolve('./config'));

module.exports = async function (user) {
  const password = await helpers.checkAndHashPassword(user.password, [user.username]);

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
