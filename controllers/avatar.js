const sharp = require('sharp'),
      fs = require('fs'),
      path = require('path'),
      { promisify } = require('util');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// convert fs callback functions to Promises
const readFile = promisify(fs.readFile),
      mkdir = promisify(fs.mkdir),
      unlink = promisify(fs.unlink);

async function patch(req, res, next) {
  const temporaryFilePath = path.resolve(`./${req.file.path}`);
  const { username } = req.auth;
  // sizes of the profile pictures
  const sizes = [512, 256, 128, 64, 32, 16];

  try {
    // read the uploaded file
    const buffer = await readFile(temporaryFilePath);

    const imgPromises = sizes.map(size => resizeSaveAvatar(buffer, size, username));
    await Promise.all(imgPromises);

    // remove the temporary file
    await unlink(temporaryFilePath);

    return res.status(204).end();
  } catch (e) {
    // remove the temporary file
    await unlink(temporaryFilePath);

    return next(e);
  }
}

async function resizeSaveAvatar(buffer, size, username) {
  // create the user directory if not exist
  try {
    await mkdir(path.resolve(`./files/avatars/${username}`));
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  // crop and resize the file
  const info = await sharp(buffer)
    .resize(size, size)
    .jpeg()
  // save the file to files/avatars/:username/512.jpg
    .toFile(path.resolve(`./files/avatars/${username}/${size}`));

  return info;
}

const parseAvatar = upload.single('avatar');

async function removeTemporaryFileOnError(err, req, res, next) {
  const temporaryFilePath = path.resolve(`./${req.file.path}`);
  await unlink(temporaryFilePath);

  return next(err);
}

module.exports = { patch, parseAvatar, removeTemporaryFileOnError };
