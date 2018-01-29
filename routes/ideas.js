'use strict';

const express = require('express'),
      path = require('path'),
      router = express.Router();

const authorize = require(path.resolve('./controllers/authorize')),
      ideaControllers = require(path.resolve('./controllers/ideas')),
      ideaValidators = require(path.resolve('./controllers/validators/ideas'));

router.route('/')
  // post a new idea
  .post(authorize.onlyLogged, ideaValidators.post, ideaControllers.post);

router.route('/:id')
  // read idea by id
  .get(authorize.onlyLogged, ideaValidators.get, ideaControllers.get);

module.exports = router;
