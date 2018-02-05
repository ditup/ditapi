'use strict';

const account = require('./account'),
      authenticate = require('./authenticate'),
      avatar = require('./avatar'),
      contacts = require('./contacts'),
      definitions = require('./definitions'),
      ideas = require('./ideas'),
      ideaTags = require('./idea-tags'),
      messages = require('./messages'),
      params = require('./params'),
      tags = require('./tags'),
      userTags = require('./user-tags'),
      users = require('./users');


module.exports = Object.assign({ definitions }, account, authenticate, avatar, contacts, ideas, ideaTags, messages, params, tags, users, userTags);
