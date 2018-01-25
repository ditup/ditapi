'use strict';

const validate = require('./validate-by-schema');

const post = validate('postTags');
const getTagsRelatedToTags = validate('getTagsRelatedToTags');
const like = validate('getTagsLike');
const relatedToMyTags = validate('getTagsRelatedToMyTags');
const random = validate('randomTags');
const popularByUses = validate('getPopularTagsByUses');

module.exports = { post, getTagsRelatedToTags, like, relatedToMyTags, random, popularByUses };
