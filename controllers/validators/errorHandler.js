/**
 * @param {Array} err - err should be an array of error objects ready to display
 */

module.exports = function (err, req, res, next) {
  if (Array.isArray(err)) {

    const errors = err.map((e) => {

      // remapping errors from json-schema (ajv) validation (and TODO make it a default when validation is fully refactored)
      if (e.hasOwnProperty('dataPath')) { // is this an ajv json-schema error?
        if (e.keyword === 'additionalProperties') { // invalid attributes are failing additionalProperties: false
          e.param = 'attributes';
          e.msg = 'unexpected attribute';
        } else if (e.keyword === 'required') { // missing attributes are missing fields from required: ['required', 'fields']
          e.param = 'attributes';
          e.msg = 'missing attribute';
        } else { // otherwise we use the last part of failing dataPath to name the error.
          const dataPath = e.dataPath.split('.');
          const param = dataPath[dataPath.length - 1];
          e.param = param;
        }
      }

      return {
        meta: e.msg || e.message || e,
        title: (e.param) ? `invalid ${e.param}` : 'invalid',
        detail: e.msg || ''
      };
    });

    return res.status(400).json({
      errors
    });
  }

  return next(err);
};
