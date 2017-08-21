'use strict';

const _ = require('lodash'),
      path = require('path');

/*
 * Initialises ajv for comparing queries parameters with schemas.
 * Loading schemas from json files (they should be loaded only once)
 */
const { ajv } = require(path.resolve('./controllers/validators/ajvInit'));
const schema = require('./schema');
ajv.addSchema(schema, 'go');

/**
 * choose a route based on req.query, req.body etc
 * @param {string[]} paths - check existence of the provided paths on req object
 * @param {string} [schema] - check req against the provided schema
 *
 * @returns express middleware
 */
module.exports = function (paths, schema) {
  return function (req, res, next) {
    let go = paths.every(path => _.has(req, path));

    // checking validity with schema
    // for success, schema is either not provided, or request is valid against it
    if (go && typeof(schema) === 'string') {
      go = ajv.validate(`go#/${schema}`, req);
    }

    // we're in the right router. continue...
    if (go) return next();

    // wrong router. check another one.
    next('route');

  };
};
