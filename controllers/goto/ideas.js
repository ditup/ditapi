'use strict';

const route = require('./goto');

module.exports = {
  get: {
    withMyTags: route(['query.filter.withMyTags'])
  }
};
