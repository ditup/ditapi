'use strict';

const path = require('path'),
      _ = require('lodash');

const models = require(path.resolve('./models'));

exports.fill = async function (data) {
  const def = {
    users: 0,
    verifiedUsers: [],
    tags: 0,
    namedTags: [],
    userTag: []
  };

  data = _.defaults(data, def);

  const processed = processData(data);

  for(const user of processed.users) {
    await models.user.create(_.pick(user, ['username', 'email', 'password']));
    if (user.verified === true)
      await models.user.finalVerifyEmail(user.username);
  }

  for(const tag of processed.tags) {
    const tagData = _.pick(tag, ['tagname', 'description']);
    tagData.creator = processed.users[tag.creator];
    await models.tag.create(tagData);
  }

  for(const userTag of processed.userTag) {
    const username = userTag.user.username;
    const tagname = userTag.tag.tagname;
    const story = userTag.story || '';
    const relevance = userTag.relevance || 3;
    await models.userTag.create({ username, tagname, story, relevance });
  }

  return processed;
};

exports.clear = function () {
  return models.db.truncate();
};

function processData(data) {
  const output = {};

  output.users = _.map(_.range(data.users), function (n) {
    const resp = {
      username: `user${n}`,
      password: 'asdfasdf',
      email: `user${n}@example.com`,
      tags: []
    };
    if(data.verifiedUsers.indexOf(n) > -1) resp.verified = true;
    return resp;
  });

  // create factory tags
  const autoTags = _.map(_.range(data.tags), function (n) {
    const pickedUser = n % data.users;
    const resp = {
      tagname: `tag${n}`,
      description: `description of tag${n}`,
      creator: pickedUser
    };
    return resp;
  });

  // create named tags
  const namedTags = _.map(_.range(data.namedTags.length), function (n) {
    const pickedUser = n % data.users;
    const resp = {
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
