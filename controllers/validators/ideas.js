'use strict';

const validate = require('./validate-by-schema');

const get = validate('getIdea'),
      patch = validate('patchIdea', [['params.id', 'body.id']]),
      post = validate('postIdeas');

module.exports = { get, patch, post };
