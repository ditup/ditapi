'use strict';

const _ = require('lodash'),
      path = require('path'),
      jwt = require('jsonwebtoken');

const jwtConfig = require(path.resolve('./config/secret/jwt-config'));

const contacts = require('./contacts');

async function setAuthData(req, res, next) {
  let token;
  const user = {logged: false};
  if (_.has(req, 'headers.authorization')){
    token = req.headers.authorization;
    req.auth = {};
    const check = await tokenGetData(token);
    if (check.valid){
      ////const auth = await models.user.authenticate(username, password);
      // full login
      if(_.has(check,'data.verified') && check.data.verified)   
        req.auth.logged = true

      // partial login (unverified)
      if (!check.data.verified)
        user.loggedUnverified = true;

      if(_.has(check, 'data.username')) {
        req.auth.username = check.data.username;
      }
      if(_.has(check, 'data.verified') && (check.data.verified === true || check.data.verified === false)) {
        req.auth.loggedUnverified = !check.data.verified;
      }
      // additional information
      if (check.data.verified) {
        _.assign(user, _.pick(check.data, ['username', 'givenName', 'familyName']));
      }
    }

  }
  next();
  // TODO improve the error
}

// Authorize only logged user
// Function checks whether authorisation header is present
// and veryfies the token
// redirects to the next middleware when token is correct
// otherwise returns error 403

async function onlyLogged(req, res, next) {
  let token;
  req.auth = {logged: false, username:{}, loggedUnverified: {}};
  if (_.has(req, 'headers.authorization')){
    token = req.headers.authorization;
    const check = await tokenGetData(token);
    if (check.valid && _.has(check, 'data.username')) {
      req.auth.logged = true;
      req.auth.username = check.data.username;
      if( (check.data.verified === true || check.data.verified === false) ){
        req.auth.loggedUnverified = !check.data.verified;

        if (check.valid && check.data.verified) {
          return next();
        }
      }

    }
  }
  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
}


// Authorize only logged user who requests herself in /users/:username
// Function checks whether authorisation header is present,
// veryfies the token and checks if username from token is the same as username in params
// redirects to the next middleware when token is correct
// otherwise returns error 403
async function onlyLoggedMe(req, res, next) {
  let token;
  req.auth = {username:{}, loggedUnverified: {}};
  req.logged = false;
  if (_.has(req, 'headers.authorization')){
    token = req.headers.authorization;
    const check = (await tokenGetData(token));
    if (check.valid &&
         _.has(check, 'data.username') &&
         _.has(req, 'params.username') &&
         check.data.username === req.params.username){
      req.auth.logged = true;
      if(_.has(check, 'data.username')) {
        req.auth.username = check.data.username;
      }
      if(_.has(check, 'data.verified')) {
        req.auth.loggedUnverified = !check.data.verified;
      }
      return next();
    }
  }
  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
}

async function tokenGetData(token){
  if(!token){
    return { valid: false, data: {}};
  }
  // cutting away 'Bearer ' part of token
  token = token.split(' ').pop();
  let decoded;
  // checks if token is correct, if not jwt throws an error
  try {
    decoded = await jwt.verify(token, jwtConfig.jwtSecret);
  } catch(e) {
    return { valid: false, data: {}};
  }
  return { valid: true, data: decoded};
}


module.exports = { onlyLogged, onlyLoggedMe, contacts, setAuthData};
