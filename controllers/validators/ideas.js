'use strict';

const validate = require('./validate-by-schema');

module.exports = {
  get: validate('getIdea'),
  getIdeasCommentedBy: validate('getIdeasCommentedBy'),
  getIdeasHighlyVoted: validate('getIdeasHighlyVoted'),
  getIdeasTrending: validate('getIdeasTrending'),
  getIdeasWithCreators: validate('getIdeasWithCreators'),
  getIdeasWithMyTags: validate('getIdeasWithMyTags'),
  getIdeasWithTags: validate('getIdeasWithTags'),
  getNewIdeas: validate('getNewIdeas'),
  getRandomIdeas: validate('getRandomIdeas'),
  patch: validate('patchIdea', [['params.id', 'body.id']]),
  post: validate('postIdeas')
};
