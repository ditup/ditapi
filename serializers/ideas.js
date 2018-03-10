'use strict';

const path = require('path'),
      Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

const ideaSerializer = new Serializer('ideas', {
  id: 'id',
  attributes: ['title', 'detail', 'created', 'creator', 'ideaTags'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'creator') {
      return 'users';
    }
    if (attribute === 'ideaTags') return 'idea-tags';
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
  // when we want to have ideaTags as relationships
  ideaTags: {
    ref: 'id',
    attributes: ['idea', 'tag', ''],
    typeForAttribute(attribute) {
      if (attribute === 'creator') {
        return 'users';
      }
    },
    relationshipLinks: { },
    includedLinks: { },
    // relationships
    idea: {
      ref: 'id'
    },
    tag: {
      ref: 'tagname'
    }
  }

});

function idea(data) {
  return ideaSerializer.serialize(data);
}

module.exports = { idea };
