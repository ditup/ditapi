'use strict';

let path = require('path'),
    co = require('co');
let models = require(path.resolve('./models'));

exports.isUsernameAvailable = function (username) {
  return co(function * () {
    let exists = yield models.user.exists(username);
    if (exists === false) {
      return;
    } else {
      throw new Error();
    }
  });
};

exports.isEmailAvailable = function (email) {
  return co(function * () {
    let exists = yield models.user.emailExists(email);
    if (exists === false) {
      return;
    } else {
      throw new Error();
    }
  });
};

exports.isTagnameAvailable = function (tagname) {
  return co(function * () {
    let exists = yield models.tag.exists(tagname);
    if (exists === false) {
      return;
    } else {
      throw new Error();
    }
  });
};
