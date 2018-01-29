'use strict';

const validate = require('./validate-by-schema');

const del = validate('deleteIdeaTag');
const get = validate('getIdeaTags');
const post = validate('postIdeaTags');

module.exports = { del, get, post };
