
'use strict';

const validate = require('./validate-by-schema');

module.exports = {
  get: validate('getChallenge'),
  getChallengesCommentedBy: validate('getChallengesCommentedBy'),
  getChallengesHighlyVoted: validate('getChallengesHighlyVoted'),
  getChallengesSearchTitle: validate('getChallengesSearchTitle'),
  getChallengesTrending: validate('getChallengesTrending'),
  getChallengesWithCreators: validate('getChallengesWithCreators'),
  getChallengesWithMyTags: validate('getChallengesWithMyTags'),
  getChallengesWithTags: validate('getChallengesWithTags'),
  getNewChallenges: validate('getNewChallenges'),
  getRandomChallenges: validate('getRandomChallenges'),
  patch: validate('patchChallenge', [['params.id', 'body.id']]),
  post: validate('postChallenges')
};
