'use strict';

const validate = require('./validate-by-schema');

const post = validate('postContacts', [
  ['body.to.username','auth.username', (a, b) => a !== b ]
]);

const patchConfirm = validate('patchConfirmContact', [
  ['body.id', ['params.from', 'params.to'], (bodyId, params) => bodyId === params.join('--')]
]);

const patchUpdate = validate('patchUpdateContact', [
  ['body.id', ['params.from', 'params.to'], (bodyId, params) => bodyId === params.join('--')],
  ['auth.username', 'params.from']
]);

module.exports = { post, patchUpdate, patchConfirm };
