'use strict';

const Serializer = require('jsonapi-serializer').Serializer;

const voteSerializer = new Serializer('watches', {
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

function watch(data) {
  return voteSerializer.serialize(data);
}

module.exports = { watch };
