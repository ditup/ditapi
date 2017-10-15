'use strict';

const supertest = require('supertest'),
      path = require('path'),
      defaults = require('superagent-defaults'),
      app = require(path.resolve('./app'));

/**
 * Factory of supertest agent, which is able to accept default settings (headers, auth etc).
 * You can set more defaults by executing .set(headers) on the returned value (the agent).
 * @param {boolean} [includeDefaults=true] - Should we include some default headers (content-type, accept)?
 * @returns {object} - the agent, more default values can be set on it
 *
 */
function agentFactory(includeDefaults = true) {
  const agent = defaults(supertest(app));

  if (includeDefaults === true) {
    agent
      .set({
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      });
  }

  return agent;
}

module.exports = agentFactory;
