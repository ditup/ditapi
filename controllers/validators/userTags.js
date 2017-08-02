'use strict';

const _ = require('lodash');
const rules = require('./rules');

const validateBySchema = require('./validate-by-schema');

exports.post = validateBySchema('postUserTags');

exports.patch = function (req, res, next) {
  let errors = [];

  /*
   * Check that url matches body id
   */
  const { username, tagname } = req.params;
  const [ usernameBody, tagnameBody ] = req.body.id.split('--');

  const urlMatchesBodyId = username === usernameBody && tagname === tagnameBody;

  if (!urlMatchesBodyId) {
    errors.push({
      msg: 'url should match body id'
    });
  }

  req.checkParams(_.pick(rules.tag, ['tagname']));

  req.checkBody(_.pick(rules.userTag, ['story']));

  if (req.body.relevance && !validateRelevance(req.body.relevance)) {
    errors.push({
      msg: 'relevance should be a number 1, 2, 3, 4 or 5'
    });
  }

  // check that only valid attributes are present
  const fields = ['story', 'relevance', 'id'];
  const invalidAttrs = _.difference(Object.keys(req.body), fields);
  if (invalidAttrs.length > 0) {
    errors.push({
      msg: `invalid attributes: ${invalidAttrs.join(', ')}`
    });
  }


  errors = errors.concat(req.validationErrors() || []);

  if (errors.length === 0) {
    return next();
  }

  return next(errors);
};

exports.postUserTags = function (req, res, next) {
  return next();
};

exports.patchUserTag = function (req, res, next) {
  // TODO
  return next();
};

function validateRelevance(relevance) {
  return [1, 2, 3, 4, 5].indexOf(relevance) > -1;
}
