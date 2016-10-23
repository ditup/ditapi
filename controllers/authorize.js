'use strict'

exports.onlyLogged = function (req, res, next) {
  if (req.body.user.logged === true) return next();

  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
};

exports.onlyLoggedMe = function (req, res, next) {
  let isLogged = req.body.user.logged === true;
  let isMe = req.body.user.username === req.params.username;
  if (isLogged && isMe === true) return next();

  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
};
