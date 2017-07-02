'use strict';

/*
 * Initialises ajv for comparing queries parameters with schemas.
 * Loading schemas from json files (they should be loaded only once)
 */
const Ajv = require('ajv'),
      ajv = new Ajv({allErrors: true}),
      schema = require('./schema.json');

ajv.addSchema(schema, 'sch');

module.exports = { ajv };
