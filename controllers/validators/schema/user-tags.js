'use strict';

const { tagname, story, relevance } = require('./paths');

const postUserTags = {
  id: 'postUserTags',
  properties: {
    body: {
      properties: {
        tag: {
          properties: {
            tagname
          }
        },
        story,
        relevance
      },
      additionalProperties: false,
      required: ['tag', 'story', 'relevance']
    }
  },
  required: ['body']
};

const patchUserTag = {
  id: 'patchUserTag',
  properties: {
    body: {
      properties: {
        story,
        relevance,
        id: {}
      },
      additionalProperties: false,
      required: ['id']
    }
  },
  required: ['body']
};

module.exports = { postUserTags, patchUserTag };
