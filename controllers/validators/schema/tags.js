'use strict';

const { tagname, tagsList, page, pageOffset0 } = require('./paths');

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

const getTagsRelatedToTags = {
  id: 'getTagsRelatedToTags',
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            relatedToTags: tagsList
          },
          required: ['relatedToTags']
        },
        page
      },
      required: ['filter']
    }
  },
  required: ['query']
};

const getTagsRelatedToMyTags = {
  properties: {
    query: {
      properties: {
        page
      }
    }
  },
  required: ['query']
};

const getTagsLike = {
  properties: {
    query: {
      properties: {
        page: pageOffset0
      }
    }
  },
  required: ['query']
};

const randomTags = {
  properties: {
    query: {
      properties: {
        page: pageOffset0
      }
    }
  },
  required: ['query']
};

const getPopularTagsByUses = {
  properties: {
    query: {
      properties: {
        page: pageOffset0
      }
    }
  },
  required: ['query']
};

module.exports = { postTags, getTagsRelatedToTags, getTagsRelatedToMyTags, getTagsLike, randomTags, getPopularTagsByUses };
