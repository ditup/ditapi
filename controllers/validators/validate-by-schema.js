const { ajv } = require('./ajvInit');
const _ = require('lodash');

/**
 * Creates the express middleware function for validating requests with json-schema.
 *
 * @param {string} schema - the id of the schema for validating the request. The schema should be specified in ./schema.js. It validates the whole express req object, so the body, query and/or params should be specified in the schema. See examples of `postUserTags` and `patchUserTag` in ./schema.js.
 * @param {[string, string, function][]} consistency - the consistency of request fields
 * @returns {function} - the express middleware function which will execute the validation as needed. The error handler for validation is in ./errorHandler.js
 */
module.exports = function (schema, consistency) {
  return function (req, res, next) {
    console.log('RRR', req.query);
    console.log('QQQQ', req.query);
    const valid = ajv.validate(`sch#/${schema}`, req);
    console.log('vvvv', ajv.errors);
    if (!valid) {
      return next(ajv.errors);
    }

    const consistencyCheck = validateConsistency(consistency, req);
    if (!consistencyCheck.valid) {
      return next(consistencyCheck.errors);
    }

    return next();
  };
};

/**
 * TODO make correct JSDoc
 * @param {[string, string, ?function][]} consistency - paths to fields in req to compare
 *
 * @returns { valid: boolean, errors: ValidationError[]}
 */
function validateConsistency(requirements, req) {
  // if nothing is provided, return valid
  if (!requirements) return { valid: true };

  let valid = true;
  const errors = [];
  // if array provided, process every element of it
  requirements.forEach((requirement) => {
    const { valid: isValid, error } = checkRequirement(requirement, req);
    valid = valid && isValid;
    if (!isValid) {
      errors.push(error);
    }
  });

  return { valid, errors };
}

/**
 * @param {string|string[]} field0 - path to the value from request object to compare
 * @param {string|string[]} field1 - path to the value from request object to compare (2)
 * @param {function} [compareFunction=equality] - a function to compare the provided fields
 * @param {object} req - an object on which to perform the search for fields
 *
 *
 */
function checkRequirement([field0, field1, compareFunction], req) {
  const fields = [field0, field1];

  // read the values on provided paths
  const values = [];
  fields.forEach((field) => {
    if (typeof(field) === 'string') {
      values.push(_.get(req, field));
    }
    if (Array.isArray(field)) {
      const value = [];
      field.forEach((fieldItem) => {
        value.push(_.get(req, fieldItem));
      });
      values.push(value);
    }
  });

  let valid;
  if (compareFunction) {
    valid = compareFunction(...values);
  } else {
    valid = values[0] === values[1];
  }

  const responseObject = { valid };

  if (!valid) {
    responseObject.error = { fields, values };
    responseObject.error.message = generateErrorMessage(responseObject.error);
  }

  return responseObject;
}

function generateErrorMessage({ fields: [field0, field1] }) {
  function fieldToString(field) {
    return Array.isArray(field) ? field.join(', ') : field;
  }

  return `${fieldToString(field0)} should match ${fieldToString(field1)}`;
}
