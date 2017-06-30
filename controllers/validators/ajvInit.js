const Ajv = require('ajv');
const ajv = new Ajv({allErrors: true});

schema = require('./schema.json');

ajv.addSchema(schema, 'sch');

module.exports = {ajv}
