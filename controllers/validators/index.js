'use strict';

const _ = require('lodash');

const messages = require('./messages');

const rules = require('./rules');

exports.postUsers = function (req, res, next) {
  req.checkBody(_.pick(rules.user, ['username', 'email']));

  // prepare and return errors
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

exports.getUsers = function (req, res, next) {
  // parse the query like ?filter[tag]=tag1,tag2,tag3

  if (_.has(req, 'query.filter.tag')) {
    req.query.filter.tag = req.query.filter.tag.split(/,\s?/);
  }
  // TODO validate the tagnames in req.query.filter.tag
  if (_.has(req, 'query.filter.byMyTags')) {
    const filter = req.query.filter;
    filter.byMyTags = (filter.byMyTags === 'true') ? true : false;
  }

  return next();
};

exports.getUser = function (req, res, next) {
  req.checkParams(_.pick(rules.user, ['username']));

  const errors = req.validationErrors();

  const errorOutput = { errors: [] };

  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.patchUser = function (req, res, next) {
  req.checkParams(_.pick(rules.user, ['username']));
  req.checkBody(_.pick(rules.user, ['id', 'givenName', 'familyName', 'description']));
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

exports.postTags = function (req, res, next) {
  req.checkBody(_.pick(rules.tag, ['tagname', 'description']));

  const errors = req.validationErrors();

  const errorOutput = { errors: [] };
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({meta: e});
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

exports.patchTag = function (req, res, next) {
  req.checkParams(_.pick(rules.tag, ['tagname']));
  req.checkBody(_.pick(rules.tag, ['id', 'description']));
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

exports.postUserTags = function (req, res, next) {
  return next();
};

exports.patchUserTag = function (req, res, next) {
  // TODO
  return next();
};

exports.messages = messages;
