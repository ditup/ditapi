'use strict';

const path = require('path'),
      fs = require('fs-extra');

/**
 * clear the ./uploads folder (temporary files for uploading avatar)
 * the files are cleared automatically after success or catched error, but on an uncaught error they'll stay.
 * @returns Promise<void>
 */
async function clearTemporary() {
  const temp = path.resolve('./uploads');

  // rm -rf the temp folder
  await fs.remove(temp);
  // recreate the temp folder
  await fs.mkdir(temp);
}

module.exports = { clearTemporary };
