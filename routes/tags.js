'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const tagController = require(path.resolve('./controllers/tags'));
const validators = require(path.resolve('./controllers/validators'));
const authorize = require(path.resolve('./controllers/authorize'));
// post a new tag
router.route('/')
  .post(authorize.onlyLogged, validators.postTags, tagController.postTags)
  .get(authorize.onlyLogged, tagController.getTags);

router.route('/:tagname')
  .get(validators.getTag, tagController.getTag);

module.exports = router;
