'use strict';

const validate = require('./validate-by-schema');

const { promisify } = require('util');
const typeOf = require('image-type');
const fs = require('fs');
const path = require('path');

const readFile = promisify(fs.readFile);

const getUsersWithTags = validate('getUsersWithTags');
const getNewUsersWithMyTags = validate('newUsersWithMyTags');
const getUsersWithLocation = validate('getUsersWithLocation', [['query.filter.location[0]', 'query.filter.location[1]', ([loc00, loc01], [loc10, loc11]) => {
  return loc00 < loc10 && loc01 < loc11;
}]]);
const post = validate('postUsers');
const get = validate('getUser');
const patch = validate('patchUser', [['params.username', 'body.id']]);
const getUsersWithMyTags = validate('getUsersWithMyTags');
const getNewUsers = validate('newUsers');


/*
 * Patching avatar
 */
const patchAvatarHeaders = validate('patchAvatarHeaders');
const patchAvatarFile = validate('patchAvatarFile');

/**
 * Express middleware to check whether image has a supported mime-type
 */
const patchAvatarFileType = async function (req, res, next) {
  const supportedMimes = ['image/png', 'image/jpeg'];

  // validate file type
  const filePath = path.resolve(`./${req.file.path}`);
  // - read the image
  const fileBuffer = await readFile(filePath);
  // - check the image mime type
  const type = typeOf(fileBuffer);

  if (type && supportedMimes.includes(type.mime)) {
    return next();
  }

  return next([{
    param: 'mime type',
    msg: `unsupported image mime type (supports only ${supportedMimes.join(', ')})`
  }]);

};

module.exports = {
  get,
  patch,
  post,
  getUsersWithMyTags,
  getUsersWithTags,
  getNewUsers,
  getNewUsersWithMyTags,
  getUsersWithLocation,
  patchAvatarHeaders,
  patchAvatarFile,
  patchAvatarFileType
};
