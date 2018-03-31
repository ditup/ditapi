'use strict';

const route = require('./goto');

module.exports = {
  get: {
    withMyTags: route(['query.filter.withMyTags']),
    withTags: route(['query.filter.withTags']),
    new: route(['query.sort'], 'newQuery'),
    random: route(['query.filter.random']),
    withCreators: route(['query.filter.creators']),
    commentedBy: route(['query.filter.commentedBy']),
    highlyRated: route(['query.filter.highlyRated'])
  },
};
