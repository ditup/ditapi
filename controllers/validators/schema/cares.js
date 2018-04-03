'use strict';

const { id } = require('./paths');

const postCares = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    body: {
      additionalProperties: false
    },
    required: ['body', 'params']
  }
};
/*
const deleteCare = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    required: ['params']
  }
};
*/

module.exports = { /* deleteCare, */postCares };
