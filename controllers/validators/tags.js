'use strict';

const validate = require('./validate-by-schema');

const post = validate('postTags');
const get = validate('getTag');
const getTagsRelatedToTags = validate('getTagsRelatedToTags');

module.exports = { post, get, getTagsRelatedToTags };
