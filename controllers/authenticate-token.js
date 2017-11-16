'use strict';

const _ =  require('lodash'),
      auth = require('basic-auth'),
      jwt = require('jsonwebtoken'),
      path = require('path');

const models = require(path.resolve('./models')),
      config = require(path.resolve('./config'));

async function generateTokenBehavior(data) {
  let token, authenticated, verified, user, username, password;
  const responseData = {};
  // const { username: name, password: pass } = auth(data)
  // checks for authorisation headers
  // and take username and password from header
  if (_.has(data, 'headers.authorization')) {
    try{
      ({ name: username, pass: password } = auth(data));
    } catch(e) {
      // TODO error status
      responseData.status = 401;
      responseData.message = 'Invalid authorization header';
      responseData.data = {};
      return responseData;
    }
  } else {
    responseData.status = 401;
    responseData.message = 'Invalid authorization header';
    responseData.data = {};
    return responseData;
  }

  try{
    // checks if user exists
    const userExists = await models.user.exists(username);
    if (!userExists || username === undefined || password === undefined) {
      responseData.status = 401;
      responseData.message = 'User doesn\'t exist or lack of username or password';
      responseData.data = {};
      return responseData;
    }
    // checking login and password authorisation
    user = await models.user.authenticate(username, password);
    authenticated = user.authenticated;
    verified = user.verified;

    // TODO kind of error to return
    if(authenticated === undefined || verified === undefined) {
      responseData.status = 401;
      responseData.message = 'Invalid user object';
      responseData.data = {};
      return responseData;
    }

    if(!authenticated) {
      responseData.status = 401;
      responseData.message = 'Authenticaton failed';
      responseData.data = {};
      return responseData;
    }
  } catch(e) {
    responseData.status = 500;
    responseData.message = 'Database error';
    responseData.data = {};
    return responseData;
  }
  try{
    // creating token
    token = await sign(user);
    responseData.status = 200;
    responseData.data = {token};
  } catch(e) {
    responseData.status = 500;
    responseData.message = 'Token sign error';
    responseData.data = {};
    return responseData;
  }
  return responseData;
}

async function generateToken(req, res) {
  const responseData = await generateTokenBehavior(req);
  return res.status(responseData.status).json({meta:responseData.data});
}

/**
 * provided a user, returns token
 */
async function sign(user) {
  const verified = (_.has(user, 'verified'))
    ? user.verified
    : Boolean(user.email);

  const { username } = user;

  const { givenName, familyName } = (_.has(user, 'profile'))
    ? user.profile
    : user;

  // creating token
  const payload = { username, verified, givenName, familyName };

  // passing expirationTime as a config's property, to be able to stub it
  return await jwt.sign(payload, config.jwt.secret, { algorithm: 'HS256', expiresIn: config.jwt.expirationTime });
}

async function expire(req, res) {
  // get current timestamp in seconds
  const timestamp = Math.round(Date.now() / 1000);
  // get expiration value of token
  const { exp } = jwt.decode(req.headers.authorization.split(' ')[1]);

  // respond with time till expiration
  return res.status(200).json({
    meta: { exp: exp - timestamp }
  });
}

module.exports = { expire, generateToken, generateTokenBehavior, sign };
