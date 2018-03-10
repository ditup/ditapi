'use strict';

const route = require('./goto');

module.exports = {
  get: {
    withMyTags: route(['query.filter.withMyTags']),
    withTags: route(['query.filter.withTags']),
    new: route(['query.sort'], 'newQuery')
  },
};