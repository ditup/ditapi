'use strict';

const { id, content } = require('./paths');

const postComments = {
  properties: {
    params: {
      properties: {
        id
      },
      required: ['id'],
      additionalProperties: false
    },
    body: {
      properties: {
        content
      },
      required: ['content'],
      additionalProperties: false
    },
    required: ['body', 'params']
  }
};

module.exports = { postComments };
