'use strict';

const validate = require('./validate-by-schema');

const getUsersWithTags = validate('getUsersWithTags');
const getNewUsersWithMyTags = validate('newUsersWithMyTags');
const getUsersWithLocation = validate('getUsersWithLocation', [['query.filter.location[0]', 'query.filter.location[1]', ([loc00, loc01], [loc10, loc11]) => {
  return loc00 < loc10 && loc01 < loc11;
}]]);
const post = validate('postUsers');
const patch = validate('patchUser', [['params.username', 'body.id']]);
const getUsersWithMyTags = validate('getUsersWithMyTags');
const getNewUsers = validate('newUsers');

module.exports = {
  patch,
  post,
  getUsersWithMyTags,
  getUsersWithTags,
  getNewUsers,
  getNewUsersWithMyTags,
  getUsersWithLocation
};
