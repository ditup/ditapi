'use strict';

module.exports = function ({ body, created, read, notified }) {

  return {
    body,
    created: created || Date.now(),
    read: Boolean(read) || false,
    notified: Boolean(notified) || false
  };
};
