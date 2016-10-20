'use strict';

let co = require('co'),
    path = require('path');

let config = require(path.resolve('./config')),
    account = require('./account');


module.exports = function (user) {
  return co(function * () {
    let password = yield account.hash(user.password);
    let code = yield account.hash(user.emailVerifyCode);

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
  });
};
