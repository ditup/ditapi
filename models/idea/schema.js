'use strict';

module.exports = function ({ title, detail, created = Date.now() }) {
  return { title, detail, created };
};

