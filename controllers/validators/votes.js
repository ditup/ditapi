'use strict';

const validate = require('./validate-by-schema');

const del = validate('deleteVote');
const post = validate('postVotes');

module.exports = { del, post };
