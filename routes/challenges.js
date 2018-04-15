'use strict';

const express = require('express'),
      path = require('path'),
      router = express.Router();

const authorize = require(path.resolve('./controllers/authorize')),
      ditControllers = require(path.resolve('./controllers/dits')),
      ditTagControllers = require(path.resolve('./controllers/dit-tags')),
      challengeValidators = require(path.resolve('./controllers/validators/challenges')),
      challengeTagValidators = require(path.resolve('./controllers/validators/challenge-tags')),
      { parse } = require(path.resolve('./controllers/validators/parser')),
      // TODO seems quite hard to deal with it right now
      go = require(path.resolve('./controllers/goto/challenges'));

router.route('/')
  // post a new challenge
  .post(authorize.onlyLogged, challengeValidators.post, ditControllers.post);

// get challenges with my tags
router.route('/')
  .get(go.get.withMyTags, authorize.onlyLogged, parse, challengeValidators.getChallengesWithMyTags, ditControllers.getDitsWithMyTags);

// get new challenges
router.route('/')
  .get(go.get.new, authorize.onlyLogged, parse, challengeValidators.getNewChallenges, ditControllers.getNewDits);

// get challenges with specified tags
router.route('/')
  .get(go.get.withTags, authorize.onlyLogged, parse, challengeValidators.getChallengesWithTags, ditControllers.getDitsWithTags);

// get random challenges
router.route('/')
  .get(go.get.random, authorize.onlyLogged, parse, challengeValidators.getRandomChallenges, ditControllers.getRandomDits);

// get challenges with creators
router.route('/')
  .get(go.get.withCreators, authorize.onlyLogged, parse, challengeValidators.getChallengesWithCreators, ditControllers.getDitsWithCreators);

// get challenges commented by specified users
router.route('/')
  .get(go.get.commentedBy, authorize.onlyLogged, parse, challengeValidators.getChallengesCommentedBy, ditControllers.getDitsCommentedBy);

// get challenges commented by specified users
router.route('/')
  .get(go.get.highlyVoted, authorize.onlyLogged, parse, challengeValidators.getChallengesHighlyVoted, ditControllers.getDitsHighlyVoted);

// get trending challenges
router.route('/')
  .get(go.get.trending, authorize.onlyLogged, parse, challengeValidators.getChallengesTrending, ditControllers.getDitsTrending);

// get challenges with keywords
router.route('/')
  .get(go.get.searchTitle, authorize.onlyLogged, parse, challengeValidators.getChallengesSearchTitle, ditControllers.getDitsSearchTitle);


router.route('/:id')
  // read challenge by id
  .get(authorize.onlyLogged, challengeValidators.get, ditControllers.get)
  .patch(authorize.onlyLogged, challengeValidators.patch, ditControllers.patch);

router.route('/:id/tags')
  .post(authorize.onlyLogged, challengeTagValidators.post, ditTagControllers.post)
  .get(authorize.onlyLogged, challengeTagValidators.get, ditTagControllers.get);

router.route('/:id/tags/:tagname')
  .delete(authorize.onlyLogged, challengeTagValidators.del, ditTagControllers.del);

module.exports = router;
