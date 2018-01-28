'use strict';

const validate = require('./validate-by-schema');

const get = validate('getIdeaTags');
const post = validate('postIdeaTags');

module.exports = { get, post };
