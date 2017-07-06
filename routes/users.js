'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const userController = require(path.resolve('./controllers/users'));
const validators = require(path.resolve('./controllers/validators')),
      authorize = require(path.resolve('./controllers/authorize'));

// post a new user
router.route('/')
  .post(validators.users.postUsers, userController.postUsers);
//  .get(authorize.onlyLogged, validators.users.getUsers, userController.getUsers);

router.route('/')
  .get(userController.gotoGetUsersWithMyTags, authorize.onlyLogged, validators.users.getUsersWithMyTags, userController.getUsersWithMyTags);

router.route('/')
  .get(userController.gotoGetUsersWithTags, authorize.onlyLogged, validators.users.getUsersWithTags, userController.getUsersWithTags);

router.route('/')
  .get(userController.gotoGetUsersWithLocation, authorize.onlyLogged, validators.users.getUsersWithLocation, userController.getUsersWithLocation);

router.route('/')
  .get(userController.gotoGetNewUsers, authorize.onlyLogged, validators.users.getNewUsers, userController.getNewUsers);

router.route('/:username')
  .get(validators.users.getUser, userController.getUser)
  .patch(authorize.onlyLoggedMe, validators.users.patchUser, userController.patchUser, userController.getUser);

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

router.route('/:username/avatar')
  .get(authorize.onlyLogged, userController.getAvatar);

module.exports = router;
