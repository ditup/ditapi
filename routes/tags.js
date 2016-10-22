'use strict';

var express = require('express');
var router = express.Router();
var path = require('path');

var tagController = require(path.resolve('./controllers/tags'));
var validators = require(path.resolve('./controllers/validators'));
let authorize = require(path.resolve('./controllers/authorize'));
// post a new tag
router.route('/')
  .post(authorize.onlyLogged, validators.postTags, tagController.postTags);

router.route('/:tagname')
  .get(validators.getTag, tagController.getTag);

module.exports = router;
