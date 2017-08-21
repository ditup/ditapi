'use strict';

const route = require('./goto');

/**
 * Find out whether the request wants to confirm a contact
 * The alternative is just updating the contact
 */
module.exports = {
  patchConfirm: route(['body.isConfirmed'])
};
