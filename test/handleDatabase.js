'use strict';

/*
 * Create testing data for database
 *
 *
 */

const path = require('path'),
      _ = require('lodash');

const models = require(path.resolve('./models'));

exports.fill = async function (data) {
  const def = {
    users: 0,
    verifiedUsers: [],
    tags: 0,
    namedTags: [],
    userTag: [],
    messages: []
  };

  data = _.defaults(data, def);

  const processed = processData(data);

  for(const user of processed.users) {
    await models.user.create(_.pick(user, ['username', 'email', 'password']));
    if (user.verified === true)
      await models.user.finalVerifyEmail(user.username);
  }

  for(const tag of processed.tags) {
    const tagData = _.pick(tag, ['tagname']);
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

  for(const message of processed.messages) {
    const from = message.from.username;
    const to = message.to.username;
    const body = message.body;
    const created = message.created;
    const outMessage = await models.message.create({ from, to, body, created });
    if (!outMessage) {
      const e = new Error('message could not be saved');
      e.data = message;
      throw e;
    }
    message.id = outMessage.id;
  }

  return processed;
};

exports.clear = function () {
  return models.db.truncate();
};

/*
 * Prepare data for saving to database
 *
 *
 */
function processData(data) {
  const output = {};

  output.users = _.map(_.range(data.users), function (n) {
    const resp = {
      username: `user${n}`,
      password: 'asdfasdf',
      email: `user${n}@example.com`,
      tags: [],
      _messages: [],
      get messages() {
        return _.map(this._messages, message => output.messages[message]);
      }
    };
    if(data.verifiedUsers.indexOf(n) > -1) resp.verified = true;
    return resp;
  });

  // create factory tags
  const autoTags = _.map(_.range(data.tags), function (n) {
    const pickedUser = n % data.users;
    const resp = {
      tagname: `tag${n}`,
      creator: pickedUser
    };
    return resp;
  });

  // create named tags
  const namedTags = _.map(_.range(data.namedTags.length), function (n) {
    const pickedUser = n % data.users;
    const resp = {
      tagname: data.namedTags[n],
      creator: pickedUser
    };
    return resp;
  });

  // put default and named tags together
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

  // create messages
  output.messages = _.map(data.messages, function ([_from, _to, body, created], i) {
    const resp = {
      _from,
      _to,
      get from() {
        return output.users[_from];
      },
      get to() {
        return output.users[_to];
      },
      body: body || 'default message',
      created: created || Date.now() + 1000 * i
    };

    resp.from._messages.push(i);
    resp.to._messages.push(i);

    return resp;
  });

  return output;
}
