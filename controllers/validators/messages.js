'use strict';

const validate = require('./validate-by-schema');

const post = validate('postMessages', [['auth.username', 'body.to.username', (a, b) => a !== b]]);

const patch = validate('patchMessage', [['params.id', 'body.id']]);

module.exports = { post, patch };
