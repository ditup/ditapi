'use strict';

const validate = require('./validate-by-schema');

const post = validate('postVotes');

module.exports = { post };
