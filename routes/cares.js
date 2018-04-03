'use strict';

const express = require('express'),
      path = require('path');

const authorize = require(path.resolve('./controllers/authorize')),
      careControllers = require(path.resolve('./controllers/cares')),
      careValidators = require(path.resolve('./controllers/validators/cares'));

// create router and controllers
const router = express.Router();

router.route('/:id/cares')
  .post(authorize.onlyLogged, careValidators.post, careControllers.post);

// router.route('/:id/cares/care')
//   .delete(authorize.onlyLogged, voteValidators.del, voteControllers.del);

module.exports = router;
