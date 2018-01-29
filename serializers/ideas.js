'use strict';

const path = require('path'),
      Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

const ideaSerializer = new Serializer('ideas', {
  id: 'id',
  attributes: ['title', 'detail', 'created', 'creator'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'creator') {
      return 'users';
    }
  },
  creator: {
    ref: 'username',
    type: 'users',
    attributes: ['username', 'givenName', 'familyName', 'description'],
    includedLinks: {
      self: (data, { username }) => `${config.url.all}/users/${username}`
    },
    relationshipLinks: {
      related: (data, { username }) => `${config.url.all}/users/${username}`
    }
  }
});

function idea(data) {
  return ideaSerializer.serialize(data);
}

module.exports = { idea };
