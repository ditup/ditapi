'use strict';

const path = require('path'),
      _ = require('lodash');

let config = require(path.resolve('./config/default'));
let secret;

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


config.database.password = _.get(secret, 'database.password');

module.exports = config;
