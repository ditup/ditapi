'use strict';

var path = require('path'),
    _ = require('lodash'),
    co = require('co');

var models = require(path.resolve('./models'));

exports.fill = function (data) {
  return co(function * () {
    let def = {
      users: 0,
      verifiedUsers: [],
      tags: 0
    };

    data = _.defaults(data, def);

    let processed = processData(data);

    for(let user of processed.users) {
      yield models.user.create(_.pick(user, ['username', 'email', 'password']));
      if (user.verified === true)
        yield models.user.finalVerifyEmail(user.username);
    }

    for(let tag of processed.tags) {
      let tagData = _.pick(tag, ['tagname', 'description']);
      tagData.creator = processed.users[tag.creator];
      yield models.tag.create(tagData);
    }

    for(let userTag of processed.userTag) {
      let username = processed.users[userTag.user].username;
      let tagname = processed.tags[userTag.tag].tagname;
      let story = userTag.story || '';
      yield models.userTag.create({ username, tagname, story });
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
      email: `user${n}@example.com`,
      tags: []
    };
    if(data.verifiedUsers.indexOf(n) > -1) resp.verified = true;
    return resp;
  });

  output.tags = _.map(_.range(data.tags), function (n) {
    let pickedUser = n % data.users;
    let resp = {
      tagname: `tag${n}`,
      description: `description of tag${n}`,
      creator: pickedUser
    };
    return resp;
  });

  output.userTag = _.map(data.userTag, function (vals) {
    let [user, tag, story] = vals;
    let resp = { user, tag, story: story || '' };
    
    output.users[user].tags.push(tag);
    return resp;
  });


  return output;
}
