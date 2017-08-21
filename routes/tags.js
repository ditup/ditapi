'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const tagController = require(path.resolve('./controllers/tags'));
const validators = require(path.resolve('./controllers/validators'));
const authorize = require(path.resolve('./controllers/authorize'));
const { parse } = require(path.resolve('./controllers/validators/parser'));
const go = require(path.resolve('./controllers/goto/tags'));

router.route('/')
  // post a new tag
  .post(authorize.onlyLogged, validators.tags.post, tagController.postTags)
  // get tags like a string
  .get(go.get.like, authorize.onlyLogged, tagController.getTagsLike);

// get tags related to my tags
router.route('/')
  .get(go.get.relatedToMyTags, authorize.onlyLogged, tagController.relatedToMyTags);

// get tags related to given tags
router.route('/')
.get(go.get.relatedToTags, authorize.onlyLogged, parse, validators.tags.getTagsRelatedToTags, tagController.relatedToTags);

// get random tags
router.route('/')
  .get(go.get.random, authorize.onlyLogged, tagController.getRandomTags);

router.route('/:tagname')
  .get(validators.tags.get, tagController.getTag);

module.exports = router;
