'use strict';

const validate = require('./validate-by-schema');

const del = validate('deleteChallengeTag');
const get = validate('getChallengeTags');
const post = validate('postChallengeTags');

module.exports = { del, get, post };
