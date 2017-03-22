'use strict';

module.exports = function ({ tagname }) {

  return {
    tagname,
    created: Date.now(),
  };
};

