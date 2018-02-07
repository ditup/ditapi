'use strict';

const path = require('path'),
      Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

const commentSerializer = new Serializer('comments', {
  id: 'id',
  attributes: ['content', 'created', 'creator', 'primary'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'creator') {
      return 'users';
    }
    if (attribute === 'primary') {
      return 'ideas';
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
  },
  primary: {
    ref: 'id',
    attributes: []
  }
});

function comment(data) {
  return commentSerializer.serialize(data);
}

module.exports = { comment };
