'use strict';
const _ = require('lodash');

exports.getTagsRelatedToTags = function (req, res, next) {
  // TODO how to react for this filter, istnt it already checked?
  // spliting tags just for checking or forever?
  if (_.has(req, 'query.filter.relatedToTags')) {

    req.checkQuery('filter.relatedToTags', 'invalid tagnames').isTags();

    const errors = req.validationErrors();
    const errorOutput = { errors: [] };
    if (errors) {
      for(const e of errors) {
        errorOutput.errors.push({ meta: e });
      }
      return res.status(400).json(errorOutput);
    }
  }

  return next();
};
