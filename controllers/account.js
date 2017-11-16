const path = require('path'),
      mailer = require(path.resolve('./services/mailer')),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config')),
      { sign } = require(path.resolve('./controllers/authenticate-token'));


exports.resetPassword = async function (req, res, next) {

  const usernameOrEmail = req.body.id;

  // save a reset code for user
  try {
    const { username, code, email } = await models.user.createPasswordResetCode(usernameOrEmail);

    const url = `${config.appUrl.all}${config.appUrl.resetPassword(username, code)}`;
    await mailer.resetPassword({ username, email, url });
    return res.status(204).end();
  } catch (e) {
    if (e.message === 'User not found') {
      // we respond with 204 to disable guessing existent users or emails
      return res.status(204).end();
    }

    if (e.message === 'User not verified') {
      return res.status(400).json({
        errors: [
          { meta: e.message }
        ]
      });
    }

    return next(e);
  }
};

exports.updateResetPassword = async function (req, res, next) {
  const { id: username, password, code } = req.body;

  try {
    await models.user.checkPasswordResetCode(username, code);
  } catch (e) {

    if (e.message === 'User not found') {
      return res.status(404).json({
        errors: [
          { meta: e.message }
        ]
      });
    }

    return res.status(400).json({
      errors: [
        { meta: e.message }
      ]
    });
  }

  try {
    await models.user.updatePassword(username, password, true);
  } catch (e) {
    return next(e);
  }

  return res.status(204).end();
};

/**
 * Change the user's email.
 * The current verified email remains valid until the new email is verified
 * via a verification code sent to that email address.
 */
exports.updateUnverifiedEmail = async function (req, res) {

  const username = req.auth.username;
  const { email, password } = req.body;

  // check that the password provided is correct
  const { authenticated } = await models.user.authenticate(username, password);

  if (!authenticated) {
    return res.status(403).end();
  }


  // update unverified email
  const { emailVerifyCode } = await models.user.updateEmail(username, email);

  // send a link for email verification to the provided email address
  await mailer.verifyEmail({
    username,
    url: `${config.appUrl.all}${config.appUrl.verifyEmail(username, emailVerifyCode)}`,
    email,
    code: emailVerifyCode
  });

  return res.status(204).end();
};

exports.verifyEmail = async function (req, res, next) {
  try {
    const { id: username, emailVerificationCode: code } = req.body;

    const user = await models.user.verifyEmail(username, code);

    const token = await sign(user);

    return res.status(200).json({ meta: {
      email: user.email,
      token
    } });

  } catch (e) {
    return next([e]);
  }
};

exports.changePassword = async function (req, res, next) {
  // check that the old password is correct

  const username = req.body.id;
  const { oldPassword, password } = req.body;

  const { authenticated } = await models.user.authenticate(username, oldPassword);

  if (!authenticated) {
    return res.status(403).end();
  }

  // update the password
  try {
    await models.user.updatePassword(username, password);
  } catch (e) {
    return next(e);
  }
  return res.status(204).end();
};
