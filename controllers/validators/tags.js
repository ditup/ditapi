'use strict';

const validate = require('./validate-by-schema');

const post = validate('postTags');
const get = validate('getTag');
const getTagsRelatedToTags = validate('getTagsRelatedToTags');
const like = validate('getTagsLike');
const relatedToMyTags = validate('getTagsRelatedToMyTags');
const random = validate('randomTags');

module.exports = { post, get, getTagsRelatedToTags, like, relatedToMyTags, random };
