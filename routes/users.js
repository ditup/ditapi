'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const userController = require(path.resolve('./controllers/users'));
const accountController = require(path.resolve('./controllers/users.account'));
const validators = require(path.resolve('./controllers/validators')),
      authorize = require(path.resolve('./controllers/authorize'));

// post a new user
router.route('/')
  .post(validators.postUsers, userController.postUsers)
  .get(authorize.onlyLogged, validators.getUsers, userController.getUsers);

router.route('/:username')
  .get(validators.getUser, userController.getUser)
  .patch(authorize.onlyLoggedMe, validators.patchUser, userController.patchUser, userController.getUser);

router.route('/:username/account')
  .patch(authorize.onlyLoggedMe, validators.patchAccount, accountController.patchAccount);

/**
 * Routers for userTags
 */
router.route('/:username/tags')
  .post(authorize.onlyLoggedMe, validators.userTags.post, userController.postUserTags)
  .get(userController.getUserTags);

router.route('/:username/tags/:tagname')
  .get(userController.getUserTag)
  .patch(authorize.onlyLoggedMe, validators.userTags.patch, userController.patchUserTag, userController.getUserTag)
  .delete(authorize.onlyLoggedMe, userController.deleteUserTag);

/**
 * Email verification router
 */
router.route('/:username/account/email/verify/:code')
  .get(userController.verifyEmail); // TODO validate the username & code

router.route('/:username/avatar')
  .get(authorize.onlyLogged, userController.getAvatar);

module.exports = router;
