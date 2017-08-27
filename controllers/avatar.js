const sharp = require('sharp'),
      fs = require('fs-extra'),
      path = require('path'),
      crypto = require('crypto'),
      Identicon = require('identicon.js'),
      _ = require('lodash');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const models = require(path.resolve('./models'));

async function get(req, res, next) {
  const { username } = req.params;

  const usernameExists = await models.user.exists(username);

  if (usernameExists !== true) {
    return next();
  }

  const size = _.get(req, 'query.filter.size', 512);

  const avatarPath = path.resolve(`./files/avatars/${username}/${size}`);

  res.sendFile(avatarPath, { headers: { 'content-type': 'image/jpeg'} }, async (err) => {

    if (err) {
      if (err.code === 'ENOENT') {

        const defaultPath = path.resolve(`./files/avatars/${username}/default`);
        const defaultFolderPath = path.resolve(`./files/avatars/${username}`);

        // try to find default on disk
        try {
          await fs.stat(defaultPath);
        } catch (e) {

          /*
           * default file not present
           */
          if (e.code !== 'ENOENT') {
            return next(e);
          }

          const icon = identicon(username);

          try {
            // create folder if not exist
            try {
              await fs.mkdir(defaultFolderPath);
            } catch (e) {
              if (e.code !== 'EEXIST') throw e;
            }

            await fs.writeFile(defaultPath, icon);
          } catch (e) {
            return next(err);
          }
        }

        // serve the default from disk
        return res.sendFile(defaultPath, { headers: { 'content-type': 'image/svg+xml' } }, err => { if (err) return next(err); });
      }
      return next(err);
    }
  });
}

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

async function patch(req, res, next) {
  const temporaryFilePath = path.resolve(`./${req.file.path}`);
  const { username } = req.auth;
  // sizes of the profile pictures
  const sizes = [512, 256, 128, 64, 32, 16];

  try {
    // read the uploaded file
    const buffer = await fs.readFile(temporaryFilePath);

    const imgPromises = sizes.map(size => resizeSaveAvatar(buffer, size, username));
    await Promise.all(imgPromises);

    // remove the temporary file
    await fs.unlink(temporaryFilePath);

    return res.status(204).end();
  } catch (e) {
    // remove the temporary file
    await fs.unlink(temporaryFilePath);

    return next(e);
  }
}

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

const parseAvatar = upload.single('avatar');

async function removeTemporaryFileOnError(err, req, res, next) {
  const temporaryFilePath = path.resolve(`./${req.file.path}`);
  await fs.unlink(temporaryFilePath);

  return next(err);
}

module.exports = { get, patch, parseAvatar, removeTemporaryFileOnError };
