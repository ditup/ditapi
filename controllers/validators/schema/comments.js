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

const patchComment = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    body: {
      properties: { content, id },
      required: ['content', 'id'],
      additionalProperties: false
    }
  },
  required: ['params', 'body']
};

const deleteComment = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    }
  },
  required: ['params']
};

module.exports = { deleteComment, getComments, patchComment, postComments };
