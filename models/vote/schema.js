'use strict';

module.exports = function ({ value, created = Date.now() }) {
  return { value, created };
};
