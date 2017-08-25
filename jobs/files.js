'use strict';

const path = require('path'),
      { promisify } = require('util'),
      rimraf = promisify(require('rimraf')),
      fs = require('fs');

// fs promisified
const fsp = {
  mkdir: promisify(fs.mkdir)
};

/**
 * clear the ./uploads folder (temporary files for uploading avatar)
 * the files are cleared automatically after success or catched error, but on an uncaught error they'll stay.
 * @returns Promise<void>
 */
async function clearTemporary() {
  const temp = path.resolve('./uploads');

  // rm -rf the temp folder
  await rimraf(temp);
  // recreate the temp folder
  await fsp.mkdir(temp);
}

module.exports = { clearTemporary };
