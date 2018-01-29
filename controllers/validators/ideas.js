'use strict';

const validate = require('./validate-by-schema');

const get = validate('getIdea'),
      post = validate('postIdeas');

module.exports = { get, post };
