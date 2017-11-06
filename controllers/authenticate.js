const _ = require('lodash'),
      path = require('path'),
      jwt = require('jsonwebtoken');

const config = require(path.resolve('./config'));

const jwtSecret = config.jwt.secret;

// this middleware shouldn't be applied on some url paths
// i.e. when using Basic Authorization for login with credentials
const pathBlacklist = ['/auth/token', '/auth/token/'];

async function setAuthData(req, res, next) {
  if (pathBlacklist.includes(req.path)) {
    return next();
  }

  // set the default req.auth (not logged)
  req.auth = { logged: false, loggedUnverified: false, username: null };

  if (_.has(req, 'headers.authorization')) {
    const token = req.headers.authorization;
    let username, verified;
    try {
      const data = await tokenGetData(token);
      username = data.username;
      verified = data.verified;
    } catch (e) {
      // TODO report some error message
      return res.status(403).json({
        errors: [{
          status: '403',
          title: 'Not Authorized'
        }]
      });
    }

    req.auth.username = username;
    req.auth.logged = (verified === true) ? true : false;
    req.auth.loggedUnverified = (verified === false) ? true : false;
  }

  next();
}

async function tokenGetData(token){
  // cutting away 'Bearer ' part of token
  token = token.split(' ').pop();
  return await jwt.verify(token, jwtSecret);
}

module.exports = setAuthData;
