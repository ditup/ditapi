'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const tagController = require(path.resolve('./controllers/tags'));
const { tags: validate, params: validateParams } = require(path.resolve('./controllers/validators'));
const authorize = require(path.resolve('./controllers/authorize'));
const { parse } = require(path.resolve('./controllers/validators/parser'));
const go = require(path.resolve('./controllers/goto/tags'));

router.route('/')
  // post a new tag
  .post(authorize.onlyLogged, validate.post, tagController.postTags)
  // get tags like a string
  .get(go.get.like, authorize.onlyLogged, parse, validate.like, tagController.getTagsLike);

// get tags related to my tags
router.route('/')
  .get(go.get.relatedToMyTags, authorize.onlyLogged, parse, validate.relatedToMyTags, tagController.relatedToMyTags);

// get tags related to given tags
router.route('/')
  .get(go.get.relatedToTags, authorize.onlyLogged, parse, validate.getTagsRelatedToTags, tagController.relatedToTags);

// get random tags
router.route('/')
  .get(go.get.random, authorize.onlyLogged, parse, validate.random, tagController.getRandomTags);

router.route('/:tagname')
  .all(validateParams)
  .get(tagController.getTag);

module.exports = router;
