'use strict';

module.exports = function ({ body, created }) {

  return {
    body,
    created: created || Date.now()
  };
};
