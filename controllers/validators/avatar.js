'use strict';

const validate = require('./validate-by-schema');

const typeOf = require('image-type');
const fs = require('fs-extra');
const path = require('path');

/*
 * Patching avatar
 */
const patchHeaders = validate('patchAvatarHeaders');
const patchFile = validate('patchAvatarFile');

/**
 * Express middleware to check whether image has a supported mime-type
 */
const patchFileType = async function (req, res, next) {
  const supportedMimes = ['image/png', 'image/jpeg'];

  // validate file type
  const filePath = path.resolve(`./${req.file.path}`);
  // - read the image
  const fileBuffer = await fs.readFile(filePath);
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

/*
 * Getting avatar
 */
const get = validate('getAvatar');

module.exports = { patchHeaders, patchFile, patchFileType, get };
