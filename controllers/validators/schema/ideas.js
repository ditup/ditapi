'use strict';

const { title, detail, id, ideaId, page, tagsList } = require('./paths');

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
      properties: { id },
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
          required: ['withMyTags'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getIdeasWithTags = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            withTags: tagsList
          },
          required: ['withTags'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    }
  },
  required: ['query']
};

const getNewIdeas = {
  properties: {
    query: {
      properties: {
        sort: {
          enum: ['-created']
        },
        page
      },
      required: ['sort'],
      additionalProperties: false
    },
  },
  required: ['query']
};

module.exports = { getIdea, getIdeasWithMyTags, getIdeasWithTags, getNewIdeas, patchIdea, postIdeas };
