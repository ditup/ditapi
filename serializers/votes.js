'use strict';

const Serializer = require('jsonapi-serializer').Serializer;

const voteSerializer = new Serializer('votes', {
  id: 'id',
  attributes: ['title', 'detail', 'created', 'value', 'from', 'to'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'from') return 'users';
    if (attribute === 'to') return 'ideas';
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

function vote(data) {
  return voteSerializer.serialize(data);
}

module.exports = { vote };
