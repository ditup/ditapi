'use strict'

exports.onlyLogged = function (req, res, next) {
  if (req.body.user.logged === true) return next();

  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
};
