'use strict';

module.exports = function ({ title, detail }) {

  return {
    title,
    detail,
    created: Date.now(),
  };
};

