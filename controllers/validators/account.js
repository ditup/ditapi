const rules = require('./rules');
const _ = require('lodash');

exports.resetPassword = function (req, res, next) {

  // check that only expected attributes are present in request body
  const expectedAttrs = ['id'];
  const actualAttrs = Object.keys(req.body);

  const unexpectedAttrs = _.difference(actualAttrs, expectedAttrs);

  if (unexpectedAttrs.length > 0) {
    return res.status(400).end();
  }


  // check that id is a valid username or email
  const { username: usernameRules, email: emailRules } = rules.user;

  req.checkBody({ id: usernameRules });
  req.checkBody({ id: emailRules });

  const errors = req.validationErrors();

  // if id is not valid username nor email, the errors length is 2 or more. Otherwise 1
  if (errors.length >= 2) {

    const errorOutput = { errors: [] };
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.updateResetPassword = function (req, res, next) {

  const { username, code, password } = rules.user;
  const pickedRules = {
    id: username,
    code,
    password
  };

  req.checkBody(pickedRules);
  const errors = req.validationErrors();

  // if id is not valid username nor email, the errors length is 2 or more. Otherwise 1
  if (errors) {

    const errorOutput = { errors: [] };
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.updateUnverifiedEmail = function (req, res, next) {

  const expectedAttrs = ['id', 'email', 'password'];
  const actualAttrs = Object.keys(req.body);

  // only the right attributes
  const unexpectedAttrs = _.difference(actualAttrs, expectedAttrs);
  const missingAttrs = _.difference(expectedAttrs, actualAttrs);

  if (unexpectedAttrs.length > 0) {
    return res.status(400).end();
  }

  if (missingAttrs.length > 0) {
    return res.status(400).json({
      errors: [{ meta: 'missing password attribute' }]
    });
  }

  // mismatch body.id & auth.username
  if (req.auth.username !== req.body.id) {
    return res.status(403).json({
      errors: [{ meta: `not enough rights to update user ${req.body.id}` }]
    });
  }



  const pickedRules = _.pick(rules.user, ['email', 'password']);

  req.checkBody(pickedRules);
  const errors = req.validationErrors();

  if (errors) {
    const errorOutput = { errors: [] };

    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};
