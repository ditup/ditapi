'use strict';

const validate = require('./validate-by-schema');

const get = validate('getComments'),
      post = validate('postComments');

module.exports = { get, post };
