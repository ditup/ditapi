'use strict';

const path = require('path'),
      Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

/**
 * Factory for creating serializers
 * @param {string} type - either 'comments' or 'relationships'
 * @returns Serializer
 */
function serializerFactory(type='comments') {

  // rules for 'creator' relationship
  const creator = {
    ref: 'username',
    type: 'users',
    attributes: ['username', 'givenName', 'familyName', 'description'],
    includedLinks: {
      self: (data, { username }) => `${config.url.all}/users/${username}`
    },
    relationshipLinks: {
      related: (data, { username }) => `${config.url.all}/users/${username}`
    }
  };

  return new Serializer(type, {
    id: 'id',
    attributes: ['content', 'created', 'creator', 'primary', 'reactions'],
    keyForAttribute: 'camelCase',
    typeForAttribute(attribute, data) {
      if (attribute === 'creator') {
        return 'users';
      }
      if (attribute === 'primary') {
        return data.type;
      }
    },
    creator,
    primary: {
      ref: 'id',
      attributes: []
    },
    reactions: {
      ref: 'id',
      attributes: ['content', 'created', 'creator', 'primary'],
      creator,
      primary: {
        ref: 'id'
      },
      includedLinks: {
        self: (data, { id }) => `${config.url.all}/reactions/${id}`
      },
      relationshipLinks: {
        related: (data, { id }) => `${config.url.all}/reactions/${id}`
      }
    }
  });
}

function comment(data) {
  return serializerFactory().serialize(data);
}

function reaction(data) {
  return serializerFactory('reactions').serialize(data);
}

module.exports = { comment, reaction };
