'use strict';

const validate = require('./validate-by-schema');

const del = validate('deleteCare');
const post = validate('postCares');

module.exports = { del, post };
