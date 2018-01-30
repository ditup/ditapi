'use strict';

const { title, detail, ideaId, page } = require('./paths');

const postIdeas = {
  properties: {
    body: {
      properties: {
        title,
        detail
      },
      required: ['title', 'detail'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const getIdea = {
  properties: {
    params: {
      properties: {
        id: ideaId
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  required: ['params']
};

const patchIdea = {
  properties: {
    params: {
      properties: {
        id: ideaId
      },
      required: ['id'],
      additionalProperties: false
    },
    body: {
      oneOf: [
        {
          properties: { title, detail, id: ideaId },
          required: ['title', 'detail', 'id'],
          additionalProperties: false
        },
        {
          properties: { title, id: ideaId },
          required: ['title', 'id'],
          additionalProperties: false
        },
        {
          properties: { detail, id: ideaId },
          required: ['detail', 'id'],
          additionalProperties: false
        }
      ]
    }
  },
  required: ['body', 'params']
};

const getIdeasWithMyTags = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            withMyTags: {
              enum: ['']
            }
          },
          required: ['withMyTags']
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

module.exports = { getIdea, getIdeasWithMyTags, patchIdea, postIdeas };
