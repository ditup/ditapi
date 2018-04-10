'use strict';

const { id, tagname } = require('./paths');

const getChallengeTags = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
  },
  required: ['params']
};

const postChallengeTags = {
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
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
  },
  required: ['body', 'params']
};

const deleteChallengeTag = {
  properties: {
    params: {
      properties: {
        id,
        tagname
      },
      required: ['id', 'tagname'],
      additionalProperties: false
    },
  },
  required: ['params']
};

module.exports = { deleteChallengeTag, getChallengeTags, postChallengeTags };
