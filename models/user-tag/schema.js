'use strict';

let co = require('co'),
    path = require('path');

let config = require(path.resolve('./config'));


module.exports = function ({ story }) {
  return {
    story,
    created: Date.now()
  };
};
