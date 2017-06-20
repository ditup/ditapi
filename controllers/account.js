const path = require('path'),
      mailer = require(path.resolve('./services/mailer')),
      models = require(path.resolve('./models')),
      _ = require('lodash'),
      config = require(path.resolve('./config'));

exports.gotoResertPassword = function (req, res, next) {
  if (req.query.hasOwnProperty('reset-password')) {
    return next();
  }

  return next('route');
};

exports.gotoUpdateResetPassword = function (req, res, next) {
  if (req.body.hasOwnProperty('password') && req.body.hasOwnProperty('code')) {
    return next();
  }

  return next('route');
};

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

exports.updateResetPassword = async function (req, res) {
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

  await models.user.updatePassword(username, password, true);

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

exports.gotoUpdateUnverifiedEmail = function (req, res, next) {
  const attrs = Object.keys(req.body);
  if (_.includes(attrs, 'email')) {
    return next();
  }

  return next('route');
};

exports.gotoVerifyEmail = function (req, res, next) {
  if (_.has(req.body, 'emailVerificationCode')) {
    return next();
  }

  return next('route');
};

exports.verifyEmail = async function (req, res, next) {
  try {
    const { id: username, emailVerificationCode: code } = req.body;

    await models.user.verifyEmail(username, code);

    return res.status(200).json({});

  } catch (e) {
    return next([e]);
  }
};

exports.gotoChangePassword = function (req, res, next) {
  if (_.has(req.body, 'password') && _.has(req.body, 'oldPassword')) {
    return next();
  }

  return next('route');
};

exports.changePassword = async function (req, res) {
  // check that the old password is correct

  const username = req.body.id;
  const { oldPassword, password } = req.body;

  const { authenticated } = await models.user.authenticate(username, oldPassword);

  if (!authenticated) {
    return res.status(403).end();
  }

  // update the password
  await models.user.updatePassword(username, password);
  return res.status(204).end();
};
