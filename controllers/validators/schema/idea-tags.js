'use strict';

const { ideaId, tagname } = require('./paths');

const getIdeaTags = {
  properties: {
    params: {
      properties: { id: ideaId },
      required: ['id'],
      additionalProperties: false
    },
  },
  required: ['params']
};

const postIdeaTags = {
  properties: {
    body: {
      properties: {
        tag: {
          properties: { tagname },
          required: ['tagname'],
          additionalProperties: false
        }
      },
      required: ['tag'],
      additionalProperties: false
    },
    params: {
      properties: { id: ideaId },
      required: ['id'],
      additionalProperties: false
    },
  },
  required: ['body', 'params']
};

module.exports = { getIdeaTags, postIdeaTags };
