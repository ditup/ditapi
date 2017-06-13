'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const tagController = require(path.resolve('./controllers/tags'));
const validators = require(path.resolve('./controllers/validators'));
const authorize = require(path.resolve('./controllers/authorize'));

router.route('/')
  // post a new tag
  .post(authorize.onlyLogged, validators.postTags, tagController.postTags)
  // get tags like a string
  .get(tagController.gotoGetTagsLike, authorize.onlyLogged, tagController.getTagsLike);

// get tags related to my tags
router.route('/')
  .get(tagController.gotoRelatedToMyTags, authorize.onlyLogged, tagController.relatedToMyTags);

// get tags related to given tags
router.route('/')
.get(tagController.gotoRelatedToTags, tagController.relatedToTags)

// get random tags
router.route('/')
  .get(tagController.gotoGetRandomTags, authorize.onlyLogged, tagController.getRandomTags);

router.route('/:tagname')
  .get(validators.getTag, tagController.getTag);

module.exports = router;
