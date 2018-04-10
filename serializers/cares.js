'use strict';

const Serializer = require('jsonapi-serializer').Serializer;

const voteSerializer = new Serializer('cares', {
  id: 'id',
  attributes: ['created', 'from', 'to'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute, doc) {
    if (attribute === 'from') return 'users';
    if (attribute === 'to') return doc.type;
  },
  from: {
    ref: 'username',
    type: 'users'
  },
  to: {
    ref: 'id',
    type: 'ideas'
  }
});

function care(data) {
  return voteSerializer.serialize(data);
}

module.exports = { care };
