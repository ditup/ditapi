'use strict';

const supertest = require('supertest'),
      path = require('path'),
      defaults = require('superagent-defaults'),
      app = require(path.resolve('./app'));

const agent = defaults(supertest(app));
agent
  .set({
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json'
  });

module.exports = agent;
