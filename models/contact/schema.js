'use strict';

module.exports = function ({ trust, reference, message }) {
  return {
    created: Date.now(),
    confirmed: false,
    trust,
    reference: reference || '',
    notified: false,
    message
  };
};
