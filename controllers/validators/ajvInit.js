'use strict';

/*
 * Initialises ajv for comparing queries parameters with schemas.
 * Loading schemas from json files (they should be loaded only once)
 */
const Ajv = require('ajv');

const schema = require('./schema.json');

const ajv = new Ajv({allErrors: true});
ajv.addSchema(schema, 'sch');

module.exports = { ajv };
