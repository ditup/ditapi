'use strict';

var path = require('path'),
    _ = require('lodash'),
    co = require('co');

var models = require(path.resolve('./models'));

exports.fill = function (data) {
  return co(function * () {
    let def = {
      users: 0,
      verifiedUsers: []
    };

    data = _.defaults(data, def);

    let processed = processData(data);

    for(let user of processed.users) {
      yield models.user.create(_.pick(user, ['username', 'email', 'password']));
      if (user.verified === true)
        yield models.user.finalVerifyEmail(user.username);
    }

    return processed;
  });
}

exports.clear = function () {
  return models.db.truncate();
};

function processData(data) {
  let output = {};

  output.users = _.map(_.range(data.users), function (n) {
    let resp = {
      username: `user${n}`,
      password: 'asdfasdf',
      email: `user${n}@example.com`
    };
    if(data.verifiedUsers.indexOf(n) > -1) resp.verified = true;
    return resp;
  })

  return output;
}
