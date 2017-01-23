'use strict';

var path = require('path'),
    _ = require('lodash');

var models = require(path.resolve('./models'));

exports.fill = async function (data) {
  let def = {
    users: 0,
    verifiedUsers: [],
    tags: 0,
    namedTags: [],
    userTag: []
  };

  data = _.defaults(data, def);

  let processed = processData(data);

  for(let user of processed.users) {
    await models.user.create(_.pick(user, ['username', 'email', 'password']));
    if (user.verified === true)
      await models.user.finalVerifyEmail(user.username);
  }

  for(let tag of processed.tags) {
    let tagData = _.pick(tag, ['tagname', 'description']);
    tagData.creator = processed.users[tag.creator];
    await models.tag.create(tagData);
  }

  for(let userTag of processed.userTag) {
    let username = userTag.user.username;
    let tagname = userTag.tag.tagname;
    let story = userTag.story || '';
    let relevance = userTag.relevance || 3;
    await models.userTag.create({ username, tagname, story, relevance });
  }

  return processed;
};

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

  // create factory tags
  let autoTags = _.map(_.range(data.tags), function (n) {
    let pickedUser = n % data.users;
    let resp = {
      tagname: `tag${n}`,
      description: `description of tag${n}`,
      creator: pickedUser
    };
    return resp;
  });

  // create named tags
  let namedTags = _.map(_.range(data.namedTags.length), function (n) {
    let pickedUser = n % data.users;
    let resp = {
      tagname: data.namedTags[n],
      description: `description of ${data.namedTags[n]}`,
      creator: pickedUser
    };
    return resp;
  });

  output.tags = autoTags.concat(namedTags);

  output.userTag = _.map(data.userTag, function ([userno, tagno, story, relevance]) {
    const resp = {
      userno,
      tagno,
      get tag() {
        return output.tags[tagno];
      },
      get user() {
        return output.users[userno];
      },
      story: story || '',
      relevance: relevance || 3
    };

    output.users[userno].tags.push(tagno);
    return resp;
  });


  return output;
}
