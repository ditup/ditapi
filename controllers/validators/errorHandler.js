const _ = require('lodash');

/**
 * @param {Array} err - err should be an array of error objects ready to display
 */

module.exports = function (err, req, res, next) {
  if (_.isArray(err)) {

    const errors = _.map(err, (e) => {

      // errors from json-schema should be remapped (and TODO treated well by default)
      if (e.hasOwnProperty('dataPath')) {
        // invalid attributes
        if (e.keyword === 'additionalProperties') {
          e.param = 'attributes';
          e.msg = 'unexpected attribute';
        } else if (e.keyword === 'required') {
          e.param = 'attributes';
          e.msg = 'missing attribute';
        } else {
          const dataPath = e.dataPath.split('.');
          const param = dataPath[dataPath.length - 1];
          e.param = param;
        }
      }

      return {
        meta: e.msg || e,
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
