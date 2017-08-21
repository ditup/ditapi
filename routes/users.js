'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const userController = require(path.resolve('./controllers/users'));
const validators = require(path.resolve('./controllers/validators')),
      authorize = require(path.resolve('./controllers/authorize'));

const go = require(path.resolve('./controllers/goto/users'));

const { parse } = require(path.resolve('./controllers/validators/parser'));

// post a new user
router.route('/')
  .post(validators.users.post, userController.postUsers);

// get new users who have common tags with me
router.route('/')
  .get(go.get.newWithMyTags, authorize.onlyLogged, parse, validators.users.getNewUsersWithMyTags, userController.getNewUsersWithMyTags);

// get users who have common tags with me
router.route('/')
  .get(go.get.withMyTags, authorize.onlyLogged, validators.users.getUsersWithMyTags, userController.getUsersWithMyTags);

// get users who have given tags
router.route('/')
  .get(go.get.withTags, authorize.onlyLogged, parse, validators.users.getUsersWithTags, userController.getUsersWithTags);

// get users from given location
router.route('/')
  .get(go.get.withLocation, authorize.onlyLogged, parse, validators.users.getUsersWithLocation, userController.getUsersWithLocation);

// get new users
router.route('/')
  .get(go.get.new, authorize.onlyLogged, parse, validators.users.getNewUsers, userController.getNewUsers);

// get and patch user profile
router.route('/:username')
  .get(validators.users.get, userController.getUser)
  .patch(authorize.onlyLoggedMe, validators.users.patch, userController.patchUser, userController.getUser);

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
