/**
 * CRUD avatar image (middlewares)
 */

const sharp = require('sharp'),
      fs = require('fs-extra'),
      path = require('path'),
      crypto = require('crypto'),
      Identicon = require('identicon.js'),
      _ = require('lodash');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const models = require(path.resolve('./models'));

/**
 * GET user's avatar.
 * Will return either image uploaded by user (cropped and formatted to jpeg),
 * or default svg
 */
async function get(req, res, next) {
  const { username } = req.params;

  const usernameExists = await models.user.exists(username);

  // go to 404 if user was not found
  // TODO perhaps return the error response here, with more specific message
  if (usernameExists !== true) {
    return next();
  }

  // size of avatar (square side length in pixels)
  const size = _.get(req, 'query.filter.size', 128);

  const avatarPath = path.resolve(`./files/avatars/${username}/${size}`);

  // serve the avatar uploaded by user
  res.sendFile(avatarPath, { headers: { 'content-type': 'image/jpeg'} }, async (err) => {

    if (err) {

      // if uploaded avatar not found, serve the default avatar
      if (err.code === 'ENOENT') {

        // if default avatar doesn't exist, save it on disk.
        try {
          await createDefaultAvatarIfNotExist(username);
        } catch (e) {
          return next(e);
        }

        // serve the default from disk
        const defaultPath = getDefaultAvatarPath(username);
        return res.sendFile(defaultPath, { headers: { 'content-type': 'image/svg+xml' } }, err => { if (err) return next(err); });
      }
      return next(err);
    }
  });
}

function getDefaultAvatarPath(username) {
  return path.resolve(`./files/avatars/${username}/default`);
}

async function createDefaultAvatarIfNotExist(username) {
  const defaultPath = getDefaultAvatarPath(username);
  const defaultFolderPath = path.resolve(`./files/avatars/${username}`);

  // try to find default on disk
  try {
    await fs.stat(defaultPath);
  } catch (e) {

    // throw unexpected error
    if (e.code !== 'ENOENT') {
      throw e;
    }

    // generate the default avatar, identicon
    const icon = identicon(username);

    // create folder for user's avatars if it doesn't exist already
    try {
      await fs.mkdir(defaultFolderPath);
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }

    // save the default user's avatar on disk.
    await fs.writeFile(defaultPath, icon);
  }
}

/**
 * Generate identicon for a given username
 *
 * @param {string} username - who is the avatar for
 * @returns {string} - a generated svg image
 */
function identicon(username) {
  const hash = crypto.createHash('sha256').update(username).digest('hex');

  const options = {
    size: 512,
    format: 'svg'
  };

  // create a base64 encoded png
  try {
    return new Identicon(hash, options).render().getDump();
  } catch (e) {
    throw e;
  }
}

/**
 * PATCH - update the avatar of a user
 */
async function patch(req, res, next) {
  const temporaryFilePath = path.resolve(`./${req.file.path}`);
  const { username } = req.auth;

  // sizes of the profile pictures
  const sizes = [512, 256, 128, 64, 32, 16];

  try {
    // read the uploaded file from a temporary folder
    const buffer = await fs.readFile(temporaryFilePath);

    // resize the uploaded image to expected sizes and save
    const imgPromises = sizes.map(size => resizeSaveAvatar(buffer, size, username));
    await Promise.all(imgPromises);

    return res.status(204).end();
  } catch (e) {
    return next(e);
  } finally {
    // remove the temporary file
    await fs.unlink(temporaryFilePath);
  }
}

/**
 * Resize provided image and save it.
 * @param {Buffer} buffer - the uploaded image
 * @param {number} size - the final size of the image (square side) in pixels
 * @param {string} username - user to save the avatar to
 * @returns {Promise<info>} info returned by sharp library
 */
async function resizeSaveAvatar(buffer, size, username) {
  // create the user directory if not exist
  try {
    await fs.mkdir(path.resolve(`./files/avatars/${username}`));
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

/**
 * Parse the uploaded multipart/form-data image (multer library)
 */
const parseAvatar = upload.single('avatar');

/**
 * If any error is encountered during validation etc., remove the temporary file
 * from the temporary folder
 */
async function removeTemporaryFileOnError(err, req, res, next) {
  const temporaryFilePath = path.resolve(`./${req.file.path}`);
  await fs.unlink(temporaryFilePath);

  return next(err);
}

module.exports = { get, patch, parseAvatar, removeTemporaryFileOnError };
