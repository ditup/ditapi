'use strict';

const route = require('./goto');

module.exports = {
  get: {
    withLocation: route(['query.filter.location']),
    withMyTags: route(['query.filter.byMyTags']),
    withTags: route(['query.filter.tag']),
    newWithMyTags: route(['query.filter.withMyTags'], 'newQuery'),
    new: route(['query.sort'], 'newQuery')
  }
};
