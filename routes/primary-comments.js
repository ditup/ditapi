'use strict';

const express = require('express'),
      path = require('path');

const authorize = require(path.resolve('./controllers/authorize')),
      commentControllersFactory = require(path.resolve('./controllers/comments')),
      commentValidators = require(path.resolve('./controllers/validators/comments')),
      { parse } = require(path.resolve('./controllers/validators/parser'));

/**
 * Factory to create routes
 * @param {string} primary - what is the primary object of the comments/reactions
 *    i.e. idea, comment, etc.
 * @returns object Express router
 */
module.exports = function routerFactory(primary) {

  // create a new router
  const router = express.Router();
  // make controllers from factory
  const commentControllers = commentControllersFactory(primary);

  // comments or reactions?
  const comments = (primary === 'comment') ? 'reactions' : 'comments';

  router.route(`/:id/${comments}`)
    // create a new comment (reaction) for primary (comment)
    .post(authorize.onlyLogged, commentValidators.post, commentControllers.post);


  if (primary !== 'comment') {
    router.route(`/:id/${comments}`)
    // read comments of primary
      .get(authorize.onlyLogged, parse, commentValidators.get, commentControllers.get);
  }

  return router;
};
