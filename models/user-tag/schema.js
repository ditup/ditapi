'use strict';

module.exports = function ({ story }) {
  return {
    story,
    created: Date.now()
  };
};
