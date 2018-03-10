'use strict';

const account = require('./account'),
      authenticate = require('./authenticate'),
      avatar = require('./avatar'),
      comments = require('./comments'),
      contacts = require('./contacts'),
      definitions = require('./definitions'),
      ideas = require('./ideas'),
      ideaTags = require('./idea-tags'),
      messages = require('./messages'),
      params = require('./params'),
      tags = require('./tags'),
      userTags = require('./user-tags'),
      users = require('./users');


module.exports = Object.assign({ definitions }, account, authenticate, avatar,
  comments, contacts, ideas, ideaTags, messages, params, tags, users, userTags);
