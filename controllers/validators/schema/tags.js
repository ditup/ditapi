'use strict';

const { tagname } = require('./paths');

const postTags = {
  id: 'postTags',
  properties: {
    body: {
      properties: {
        tagname
      },
      required: ['tagname'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const getTag = {
  id: 'getTag',
  properties: {
    params: {
      properties: {
        tagname
      },
      required: ['tagname'],
      additionalProperties: false
    }
  },
  required: ['params']
};

const getTagsRelatedToTags = {
  id: 'getTagsRelatedToTags',
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            relatedToTags: {
              type: 'array',
              items: tagname
            }
          },
          required: ['relatedToTags']
        }
      },
      required: ['filter']
    }
  },
  required: ['query']
};

module.exports = { postTags, getTag, getTagsRelatedToTags };
