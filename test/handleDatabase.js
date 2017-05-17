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
    userLocations: {},
    tags: 0,
    namedTags: [],
    userTag: [],
    messages: [],
    contacts: []
  };

  data = _.defaults(data, def);

  const processed = processData(data);

  for(const user of processed.users) {
    await models.user.create(_.pick(user, ['username', 'email', 'password']));

    // verify emails of verified users
    if (user.verified === true)
      await models.user.finalVerifyEmail(user.username);

    if (user.hasOwnProperty('location')) {
      await models.user.updateLocation(user.username, user.location);
    }
  }

  for(const tag of processed.tags) {
    const tagData = _.pick(tag, ['tagname']);
    tagData.creator = processed.users[tag.creator].username;
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

  for(const contact of processed.contacts) {
    const { from: { username: from }, to: { username: to }, message, reference, trust, notified, confirmed, created } = contact;
    await models.contact.create({ from, to, message, reference, notified, confirmed, created, trust });
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
      _contacts: [],
      get messages() {
        return _.map(this._messages, message => output.messages[message]);
      }
    };
    if (data.verifiedUsers.indexOf(n) > -1) resp.verified = true;

    if (data.userLocations.hasOwnProperty(n)) {
      resp.location = data.userLocations[n];
    }

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

  // create contacts
  output.contacts = _.map(data.contacts, function ([_from, _to, attrs], i) {
    const { trust, reference, message, confirmed, notified, created } = attrs || {};
    const resp = {
      _from,
      _to,
      get from() {
        return output.users[_from];
      },
      get to() {
        return output.users[_to];
      },
      trust: trust || 2 ** (i % 4), // 1, 2, 4, 8
      reference: reference || 'default reference',
      message: message || 'default message',
      confirmed: (typeof(confirmed) === 'boolean') ? confirmed : true,
      notified: (typeof(notified) === 'boolean') ? notified : true,
      created: created || Date.now() + 1000 * i
    };

    resp.from._contacts.push(i);
    resp.to._contacts.push(i);

    return resp;
  });

  return output;
}
