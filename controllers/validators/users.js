'use strict';

const validate = require('./validate-by-schema');

const getUsersWithTags = validate('getUsersWithTags');
const getNewUsersWithMyTags = validate('newUsersWithMyTags');
const getUsersWithLocation = validate('getUsersWithLocation');
const post = validate('postUsers');
const get = validate('getUser');
const patch = validate('patchUser', [['params.username', 'body.id']]);
const getUsersWithMyTags = validate('getUsersWithMyTags');
const getNewUsers = validate('newUsers');

module.exports = {
  get,
  patch,
  post,
  getUsersWithMyTags,
  getUsersWithTags,
  getNewUsers,
  getNewUsersWithMyTags,
  getUsersWithLocation
};
