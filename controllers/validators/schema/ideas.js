'use strict';

const { title, detail, ideaId } = require('./paths');

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
  }
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
  }
};

module.exports = { getIdea, postIdeas };
