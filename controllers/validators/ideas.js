'use strict';

const validate = require('./validate-by-schema');

const get = validate('getIdea'),
      getIdeasWithMyTags = validate('getIdeasWithMyTags'),
      getNewIdeas = validate('getNewIdeas'),
      patch = validate('patchIdea', [['params.id', 'body.id']]),
      post = validate('postIdeas');

module.exports = { get, getIdeasWithMyTags, getNewIdeas, patch, post };
