const path = require('path');

const { user: userModel } = require(path.resolve('models'));

exports.patchAccount = async function (req, res, next) {
  // check that the old password is correct

  const { username } = req.params;
  const { oldPassword, password } = req.body;

  const { authenticated } = await userModel.authenticate(username, oldPassword)

  if (!authenticated) {
    return res.status(403).end();
  }

  // update the password
  await userModel.updatePassword(username, password);
  return res.status(204).end();
};
