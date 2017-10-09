'use strict';

const _ =  require('lodash'),
      auth = require('basic-auth'),
      jwt = require('jsonwebtoken'),
      path = require('path');

const jwtConfig = require(path.resolve('./config/secret/jwt-config')),
      models = require(path.resolve('./models'));

async function generateTokenBehavior(data) {
  let username, password, token;
  const responseData = {};
  // checks for authorisation headers
  if (_.has(data, 'headers.authorization')) {
    try{
      username = auth(data).name;
      password = auth(data).pass;
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
      responseData.message = 'User deasn\'t exist or lack of username or password';
      responseData.data = {};
      return responseData;
    }
    // checking login and password authorisation
    const {authenticated} = await models.user.authenticate(username, password);
    if(!authenticated) {
      responseData.status = 403;
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
    // TODO - should throw any special error
    const jwtPayload = { username: username };
    token = jwt.sign(jwtPayload, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
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

module.exports = { generateToken, generateTokenBehavior };