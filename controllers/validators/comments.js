'use strict';

const validate = require('./validate-by-schema');

const del = validate('deleteComment'),
      get = validate('getComments'),
      patch = validate('patchComment', [['body.id', 'params.id']]),
      post = validate('postComments');

module.exports = { del, get, patch, post };
