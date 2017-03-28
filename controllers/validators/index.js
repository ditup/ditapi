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

  // parse the location
  if (_.has(req, 'query.filter.location')) {

    const rawLocation = req.query.filter.location.split(',');
    
    if (rawLocation.length !== 4) throw new Error('invalid amount of parameters for location provided (TODO to error 400)');

    // parse location to numbers
    const [lat1, lon1, lat2, lon2] = _.map(rawLocation, loc => +loc);

    req.query.filter.location = [[lat1, lon1], [lat2, lon2]];
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
  let errors = req.validationErrors();

  const errorOutput = { errors: [] };

  // validate location
  if (req.body.hasOwnProperty('location')) {
    const location = req.body.location;

    const locationErrors = [];

    /*
     * check that the location is an array of 2 numbers in coordinate range
     * or empty (null, '', false)
     *
     *
     */
    const isEmpty = !location;
    const isArrayOf2Numbers = _.isArray(location)
      && location.length === 2
      && _.isNumber(location[0])
      && _.isNumber(location[1])
      && _.inRange(location[0], -90, 90)
      && _.inRange(location[1], -180, 180);


    if (!(isArrayOf2Numbers || isEmpty)) {
      locationErrors.push('location should be an array of 2 numbers or falsy');
    }

    if (locationErrors.length > 0) {
      errors = (errors)
        ? errors.concat(locationErrors)
        : locationErrors;
    }
  }

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

exports.postUserTags = function (req, res, next) {
  return next();
};

exports.patchUserTag = function (req, res, next) {
  // TODO
  return next();
};

exports.messages = messages;
