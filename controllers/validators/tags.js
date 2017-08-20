'use strict';
const _ = require('lodash');
const rules = require('./rules');

exports.postTags = function (req, res, next) {
  req.checkBody(_.pick(rules.tag, ['tagname', 'description']));

  const errors = req.validationErrors();

  const errorOutput = { errors: [] };
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.getTag = function (req, res, next) {
  req.checkParams(_.pick(rules.tag, ['tagname']));

  const errors = req.validationErrors();

  const errorOutput = {errors: []};
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({meta: e});
    }

    return res.status(400).json(errorOutput);
  }
  return next();
};

exports.getTags = function (req, res, next) {
  return next();
};

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
