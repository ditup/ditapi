const { ajv } = require('./ajvInit');

/**
 * Creates the express middleware function for validating requests with json-schema.
 *
 * @param {string} schema - the id of the schema for validating the request. The schema should be specified in ./schema.js. It validates the whole express req object, so the body, query and/or params should be specified in the schema. See examples of `postUserTags` and `patchUserTag` in ./schema.js.
 * @returns {function} - the express middleware function which will execute the validation as needed. The error handler for validation is in ./errorHandler.js
 */
module.exports = function (schema) {
  return function (req, res, next) {
    // console.log(req.body, req.params, req.query);
    const valid = ajv.validate(`sch#/${schema}`, req);

    if (!valid) {
      return next(ajv.errors);
    }
    return next();
  };
};

