'use strict';

const route = require('./goto');

module.exports = {
  get: {
    like: route(['query.filter.tagname.like']),
    random: route(['query.filter.random']),
    relatedToMyTags: route(['query.filter.relatedToMyTags']),
    relatedToTags: route(['query.filter.relatedToTags']),
    popularByUses: route(['query.sort'], 'popularByUses')
  }
};
