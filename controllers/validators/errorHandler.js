const _ = require('lodash');

/**
 * @param {Array} err - err should be an array of error objects ready to display
 */

module.exports = function (err, req, res, next) {
  if (_.isArray(err)) {

    const errors = _.map(err, (e) => {
      return {
        meta: e.msg || e
      };
    });

    return res.status(400).json({
      errors
    });
  }

  return next(err);
};
