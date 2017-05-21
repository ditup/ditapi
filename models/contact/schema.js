'use strict';

module.exports = function ({ trust, reference, message, notified, isConfirmed }) {
  return {
    created: Date.now(),
    isConfirmed: Boolean(isConfirmed), // becomes false when undefined
    trust01: trust, // trust of user contact._from to user contact._to
    reference01: reference || '', // reference from contact._from to contact._to
    // there will also trust10 and reference10 be created upon confirmation by the other user
    notified: Boolean(notified),
    message
  };
};
