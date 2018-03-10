'use strict';

const express = require('express'),
      path = require('path'),
      router = express.Router();

const authorize = require(path.resolve('./controllers/authorize')),
      commentControllers = require(path.resolve('./controllers/comments')),
      ideaControllers = require(path.resolve('./controllers/ideas')),
      ideaTagControllers = require(path.resolve('./controllers/idea-tags')),
      commentValidators = require(path.resolve('./controllers/validators/comments')),
      ideaValidators = require(path.resolve('./controllers/validators/ideas')),
      ideaTagValidators = require(path.resolve('./controllers/validators/idea-tags')),
      { parse } = require(path.resolve('./controllers/validators/parser')),
      go = require(path.resolve('./controllers/goto/ideas'));

router.route('/')
  // post a new idea
  .post(authorize.onlyLogged, ideaValidators.post, ideaControllers.post);

// get ideas with my tags
router.route('/')
  .get(go.get.withMyTags, authorize.onlyLogged, parse, ideaValidators.getIdeasWithMyTags, ideaControllers.getIdeasWithMyTags);

// get new ideas
router.route('/')
  .get(go.get.new, authorize.onlyLogged, parse, ideaValidators.getNewIdeas, ideaControllers.getNewIdeas);

// get ideas with specified tags
router.route('/')
  .get(go.get.withTags, authorize.onlyLogged, parse, ideaValidators.getIdeasWithTags, ideaControllers.getIdeasWithTags);

router.route('/:id')
  // read idea by id
  .get(authorize.onlyLogged, ideaValidators.get, ideaControllers.get)
  .patch(authorize.onlyLogged, ideaValidators.patch, ideaControllers.patch);

router.route('/:id/tags')
  .post(authorize.onlyLogged, ideaTagValidators.post, ideaTagControllers.post)
  .get(authorize.onlyLogged, ideaTagValidators.get, ideaTagControllers.get);

router.route('/:id/tags/:tagname')
  .delete(authorize.onlyLogged, ideaTagValidators.del, ideaTagControllers.del);

router.route('/:id/comments')
  // create a new comment for idea
  .post(authorize.onlyLogged, commentValidators.post, commentControllers.post)
  // read comments of idea
  .get(authorize.onlyLogged, parse, commentValidators.get, commentControllers.get);

module.exports = router;
