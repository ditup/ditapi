'use strict'

// true logged means correct auth data and email verified
// true loggedUnverified means correct auth data and unverified email
// true logged me makes sense only when requesting /users/:username[/...]
//    it means the requested user is the logged user

// Authorize only logged user
exports.onlyLogged = function (req, res, next) {
  if (req.body.user.logged === true) return next();

  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
};

// Authorize only logged user who requests herself in /users/:username
exports.onlyLoggedMe = function (req, res, next) {
  let isLogged = req.body.user.logged === true;
  let isMe = req.body.user.username === req.params.username;
  if (isLogged && isMe === true) return next();

  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
};
