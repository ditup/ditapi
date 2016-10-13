'use strict';

var path = require('path');

var config;
var secret;

switch (process.env.NODE_ENV) {
  case 'test':
    config = require(path.resolve('./config/test'));
    secret = require(path.resolve('./config/secret/test'));
    break;
  case 'development':
    config = require(path.resolve('./config/development'));
    secret = require(path.resolve('./config/secret/development'));
    break;
  case 'production':
    config = require(path.resolve('./config/production'));
    secret = require(path.resolve('./config/secret/production'));
    break;
  default:
    config = require(path.resolve('./config/default'));
    secret = require(path.resolve('./config/secret/default'));
}

config.database.password = secret.database.password;

exports = config;
