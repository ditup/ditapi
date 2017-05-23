'use strict';

const path = require('path'),
      _ = require('lodash');
const Serializer = require('jsonapi-serializer').Serializer;
const config = require(path.resolve('./config/config'));

const contactSerializer = new Serializer('contacts', {
  attributes: ['trust', 'reference', 'created', 'isConfirmed', 'confirmed', 'from', 'to', 'message'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'from' || attribute === 'to') {
      return 'users';
    }
  },
  topLevelLinks: {
    self: (data) => {
      if (_.isArray(data)) {
        return `${config.url.all}/contacts`;
      }

      return `${config.url.all}/contacts/${data.from.username}/${data.to.username}`;
    }
  },
  from: generateUserRelation('from'),
  to: generateUserRelation('to')
});

function generateUserRelation(name) {
  return {
    ref: 'username',
    attributes: ['username', 'givenName', 'familyName', 'description'],
    includedLinks: {
      self: (data, { username }) => {
        return `${config.url.all}/users/${username}`;
      }
    },
    relationshipLinks: {
      self: (data) => `${config.url.all}/contacts/${data.from.username}/${data.to.username}/relationships/${name}`,
      related: (data, { username }) => `${config.url.all}/users/${username}`
    }
  };
}

exports.contact = function (data) {
  return contactSerializer.serialize(data);
};
