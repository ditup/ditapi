'use strict';

const path = require('path');
const Serializer = require('jsonapi-serializer').Serializer;
const config = require(path.resolve('./config/config'));

const messageSerializer = new Serializer('messages', {
  attributes: ['body', 'created', 'read', 'from', 'to'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'from' || attribute === 'to') {
      return 'users';
    }
  },
  topLevelLinks: {
    self: (data) => `${config.url.all}/messages/${data.id}`
  },
  from: {
    ref: 'username',
    attributes: ['username', 'givenName', 'familyName', 'description'],
    includedLinks: {
      self: (data, { username }) => `${config.url.all}/users/${username}`
    },
    relationshipLinks: {
      self: (data, { username }) => `${config.url.all}/messages/${data.id}/relationships/from/${username }`,
      related: (data, { username }) => `${config.url.all}/users/${username}`
    }
  },
  get to() {
    return this.from;
  }
});
exports.message = function (data) {
  return messageSerializer.serialize(data);
};
