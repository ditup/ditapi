'use strict';

// true logged means correct auth data and email verified
// true loggedUnverified means correct auth data and unverified email
// true logged me makes sense only when requesting /users/:username[/...]
//    it means the requested user is the logged user

// Authorize only logged user
function onlyLogged(req, res, next) {
  if (req.auth.logged === true) return next();
  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
}

// Authorize only logged user who requests herself in /users/:username
function onlyLoggedMe(req, res, next) {
  const isLogged = req.auth.logged === true;
  const isMe = req.auth.username === req.params.username;
  if (isLogged && isMe === true) return next();

  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
}

module.exports = { onlyLogged, onlyLoggedMe };
