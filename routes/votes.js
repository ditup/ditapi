'use strict';

const express = require('express'),
      path = require('path');

const authorize = require(path.resolve('./controllers/authorize')),
      voteControllers = require(path.resolve('./controllers/votes')),
      voteValidators = require(path.resolve('./controllers/validators/votes'));

// create router and controllers
const router = express.Router();

router.route('/:id/votes')
  .post(authorize.onlyLogged, voteValidators.post, voteControllers.post);

module.exports = router;
