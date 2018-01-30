'use strict';

const validate = require('./validate-by-schema');

const get = validate('getIdea'),
      getIdeasWithMyTags = validate('getIdeasWithMyTags'),
      patch = validate('patchIdea', [['params.id', 'body.id']]),
      post = validate('postIdeas');

module.exports = { get, getIdeasWithMyTags, patch, post };
