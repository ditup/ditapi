'use strict';

var express = require('express');
var router = express.Router();
var path = require('path');
var userController = require(path.resolve('./controllers/users'));
var validators = require(path.resolve('./controllers/validators'));

// post a new user
router.route('/')
  .post(validators.postUsers, userController.postUsers);

router.route('/:username')
  .get(validators.getUser, userController.getUser);

router.route('/:username/account/email/verify/:code')
  .get(userController.verifyEmail); // TODO validate the username & code

module.exports = router;
