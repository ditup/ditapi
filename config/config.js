'use strict';

var path = require('path'),
    _ = require('lodash');

var config = require(path.resolve('./config/default'));
var secret;

switch (process.env.NODE_ENV) {
  case 'test':
    config = _.extend(config, require(path.resolve('./config/test')));
    secret = _.extend(secret, require(path.resolve('./config/secret/test')));
    break;
  case 'development':
    config = _.extend(config, require(path.resolve('./config/development')));
    secret = _.extend(secret, require(path.resolve('./config/secret/development')));
    break;
  case 'production':
    config = _.extend(config, require(path.resolve('./config/production')));
    secret = _.extend(secret, require(path.resolve('./config/secret/production')));
    break;
  default:
}

// fill the missing default values


config.database.password = secret.database.password;

module.exports = config;
