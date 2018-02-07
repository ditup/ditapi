'use strict';

const { id, content, page } = require('./paths');

const postComments = {
  properties: {
    params: {
      properties: { id },
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

const getComments = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    query: {
      properties: {
        page,
        sort: {
          enum: ['-created', 'created']
        }
      },
      additionalProperties: false
    }
  },
  required: ['params', 'query']
};

module.exports = { getComments, postComments };
