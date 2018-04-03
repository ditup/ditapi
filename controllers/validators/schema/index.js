'use strict';

const account = require('./account'),
      authenticate = require('./authenticate'),
      avatar = require('./avatar'),
      cares = require('./cares'),
      comments = require('./comments'),
      contacts = require('./contacts'),
      definitions = require('./definitions'),
      ideas = require('./ideas'),
      ideaTags = require('./idea-tags'),
      messages = require('./messages'),
      params = require('./params'),
      tags = require('./tags'),
      userTags = require('./user-tags'),
      users = require('./users'),
      votes = require('./votes');


module.exports = Object.assign({ definitions }, account, authenticate, avatar, cares,
  comments, contacts, ideas, ideaTags, messages, params, tags, users, userTags, votes);
