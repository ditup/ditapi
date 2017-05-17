'use strict';

module.exports = function ({ trust, reference, message, notified, confirmed }) {
  return {
    created: Date.now(),
    confirmed: Boolean(confirmed), // becomes false when undefined
    trust01: trust, // trust of user contact._from to user contact._to
    reference01: reference || '', // reference from contact._from to contact._to
    // there will also trust10 and reference10 be created upon confirmation by the other user
    notified: Boolean(notified),
    message
  };
};
