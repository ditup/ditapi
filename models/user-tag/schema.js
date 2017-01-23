'use strict';

module.exports = function ({ story, relevance }) {
  return {
    story,
    relevance,
    created: Date.now()
  };
};
