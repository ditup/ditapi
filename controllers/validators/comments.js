'use strict';

const validate = require('./validate-by-schema');

const post = validate('postComments');

module.exports = { post };
