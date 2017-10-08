'use strict';

const _ = require('lodash'),
	path = require('path'),
	jwt = require('jsonwebtoken');

const jwtConfig = require(path.resolve('./config/secret/jwt-config'));

const contacts = require('./contacts');

// Authorize only logged user
// Function checks whether authorisation header is present
// and veryfies the token
// redirects to the next middleware when token is correct
// otherwise returns error 403
async function onlyLogged(req, res, next) {
  let token;
  if (_.has(req, 'headers.authorization')){
    token = req.headers.authorization;
	if ((await tokenGetData(token)).valid) {
	  return next();
	}
  }
  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
};

// Authorize only logged user who requests herself in /users/:username
// Function checks whether authorisation header is present,
// veryfies the token and checks if username from token is the same as username in params
// redirects to the next middleware when token is correct
// otherwise returns error 403
async function onlyLoggedMe(req, res, next) {
  let token;
  if (_.has(req, 'headers.authorization')){
    token = req.headers.authorization; 
	 const check = await tokenGetData(token);
	 if (check.valid &&
	 	 _.has(check, 'data.username') &&
	 	 _.has(req, 'params.username') &&
	 	 check.data.username === req.params.username){
	  	return next();
	  }
  }
  return res.status(403).json({ errors: ['Not Authorized'] });
  // TODO improve the error
};

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


module.exports = { onlyLogged, onlyLoggedMe, contacts}
