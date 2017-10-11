/**
 * Set CORS headers
 */

const path = require('path'),
      config = require(path.resolve('./config'));

module.exports = function (req, res, next) {
  // a list of allowed CORS Origins from config
  const { originWhitelist } = config;

  // check whether the request origin is present in whitelist
  const origin = (originWhitelist.includes(req.headers.origin))
    ? req.headers.origin
    : 'none';

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');

  return next();
};
