'use strict';

const { id, voteValue: value } = require('./paths');

const postVotes = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    body: {
      properties: { value },
      required: ['value'],
      additionalProperties: false
    },
    required: ['body', 'params']
  }
};

const deleteVote = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    required: ['params']
  }
};

module.exports = { deleteVote, postVotes };
