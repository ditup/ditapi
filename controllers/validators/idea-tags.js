'use strict';

const validate = require('./validate-by-schema');

const post = validate('postIdeaTags');

module.exports = { post };
