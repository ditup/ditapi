'use strict';

module.exports = function ({ content, created = Date.now() }) {
  return { content, created };
};
