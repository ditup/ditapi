'use strict';

const path = require('path');
const Serializer = require('jsonapi-serializer').Serializer;
const config = require(path.resolve('./config/config'));

const contactSerializer = new Serializer('contacts', {
  attributes: ['trust', 'reference', 'created', 'confirmed', 'from', 'to'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'from' || attribute === 'to') {
      return 'users';
    }
  },
  topLevelLinks: {
    self: (data) => `${config.url.all}/contacts/${data.from.username}/${data.to.username}`
  },
  from: generateUserRelation('from'),
  to: generateUserRelation('to')
});

function generateUserRelation(name) {
  return {
    ref: 'username',
    attributes: ['username', 'givenName', 'familyName', 'description'],
    includedLinks: {
      self: (data, { username }) => `${config.url.all}/users/${username}`
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
