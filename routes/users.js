'use strict';

var express = require('express');
var router = express.Router();
var path = require('path');
var userController = require(path.resolve('./controllers/users'));
var validators = require(path.resolve('./controllers/validators')),
    authorize = require(path.resolve('./controllers/authorize'));

// post a new user
router.route('/')
  .post(validators.postUsers, userController.postUsers);

router.route('/:username')
  .get(validators.getUser, userController.getUser)
  .patch(validators.patchUser, userController.patchUser, userController.getUser);

router.route('/:username/tags')
  .post(authorize.onlyLoggedMe, validators.postUserTags, userController.postUserTags)
  .get(userController.getUserTags);

router.route('/:username/tags/:tagname')
  .get(userController.getUserTag)
  .delete(authorize.onlyLoggedMe, userController.deleteUserTag);

router.route('/:username/account/email/verify/:code')
  .get(userController.verifyEmail); // TODO validate the username & code

module.exports = router;
