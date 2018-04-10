'use strict';

const express = require('express'),
      path = require('path'),
      router = express.Router();

const authorize = require(path.resolve('./controllers/authorize')),
      ideaControllers = require(path.resolve('./controllers/ideas')),
      ideaTagControllers = require(path.resolve('./controllers/idea-tags')),
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

// get random ideas
router.route('/')
  .get(go.get.random, authorize.onlyLogged, parse, ideaValidators.getRandomIdeas, ideaControllers.getRandomIdeas);

// get ideas with creators
router.route('/')
  .get(go.get.withCreators, authorize.onlyLogged, parse, ideaValidators.getIdeasWithCreators, ideaControllers.getIdeasWithCreators);

// get ideas commented by specified users
router.route('/')
  .get(go.get.commentedBy, authorize.onlyLogged, parse, ideaValidators.getIdeasCommentedBy, ideaControllers.getIdeasCommentedBy);

// get ideas commented by specified users
router.route('/')
  .get(go.get.highlyVoted, authorize.onlyLogged, parse, ideaValidators.getIdeasHighlyVoted, ideaControllers.getIdeasHighlyVoted);

// get trending ideas
router.route('/')
  .get(go.get.trending, authorize.onlyLogged, parse, ideaValidators.getIdeasTrending, ideaControllers.getIdeasTrending);

// get ideas with keywords
router.route('/')
  .get(go.get.searchTitle, authorize.onlyLogged, parse, ideaValidators.getIdeasSearchTitle, ideaControllers.getIdeasSearchTitle);


router.route('/:id')
  // read idea by id
  .get(authorize.onlyLogged, ideaValidators.get, ideaControllers.get)
  .patch(authorize.onlyLogged, ideaValidators.patch, ideaControllers.patch);

router.route('/:id/tags')
  .post(authorize.onlyLogged, ideaTagValidators.post, ideaTagControllers.post)
  .get(authorize.onlyLogged, ideaTagValidators.get, ideaTagControllers.get);

router.route('/:id/tags/:tagname')
  .delete(authorize.onlyLogged, ideaTagValidators.del, ideaTagControllers.del);

module.exports = router;
