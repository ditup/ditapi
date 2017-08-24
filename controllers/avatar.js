const sharp = require('sharp'),
      fs = require('fs'),
      path = require('path'),
      q = require('q');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// convert fs callback functions to Promises
const readFile = q.denodeify(fs.readFile),
      mkdir = q.denodeify(fs.mkdir);

async function patch(req, res) {
  // read the uploaded file
  const buffer = await readFile(path.resolve(`./${req.file.path}`));

  const { username } = req.auth;

  const sizes = [512, 256, 128, 64, 32, 16];

  const imgPromises = sizes.map(size => resizeSaveAvatar(buffer, size, username));
  await Promise.all(imgPromises);

  return res.status(204).end();
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

module.exports = { patch, parseAvatar };
