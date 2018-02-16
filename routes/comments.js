'use strict';

const express = require('express'),
      path = require('path');

const authorize = require(path.resolve('./controllers/authorize')),
      commentControllersFactory = require(path.resolve('./controllers/comments')),
      commentValidators = require(path.resolve('./controllers/validators/comments'));

/**
 * This factory can create routes for comments/reactions of various primary objects
 * @param {string} primary: i.e. idea, comment, ...
 * @returns object - Express router
 */
module.exports = function routeFactory(primary) {

  // create router and controllers
  const router = express.Router();
  const commentControllers = commentControllersFactory(primary);

  router.route('/:id')
    // update a comment or reaction
    .patch(authorize.onlyLogged, commentValidators.patch, commentControllers.patch)
    // delete a comment or reaction
    .delete(authorize.onlyLogged, commentValidators.del, commentControllers.del);

  return router;
};
