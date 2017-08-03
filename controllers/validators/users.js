'use strict';

const _ = require('lodash');

const parser = require('./parser'),
      rules = require('./rules'),
      schema = require('./schema'),
      { ajv } = require('./ajvInit');

exports.postUsers = function (req, res, next) {
  // req.checkBody(_.pick(rules.user, ['username', 'email', 'password']));

  const validate = ajv.compile(schema.postUsers.body);
  const valid = validate(req.body);

  if (!valid) {
    const errorOutput = ajv.errorsText(validate.errors);
    return res.status(400).json({'errors':errorOutput});
  }
  return next();
};

exports.getUsersWithTags = function (req, res, next) {

  req.query = parser.parseQuery(req.query, parser.parametersDictionary);

  const validate = ajv.compile(schema.getUsersWithTags.query);

  const valid = validate(req.query);

  if (!valid) {
    const errorOutput = ajv.errorsText(validate.errors);
    return res.status(400).json({'errors':errorOutput});
  }
  return next();

  // TODO validate the tagnames in req.query.filter.tag
};

exports.getUsersWithMyTags = function (req, res, next) {
  if (_.has(req, 'query.filter.byMyTags')) {
    const filter = req.query.filter;
    filter.byMyTags = (filter.byMyTags === 'true') ? true : false;
  }
  return next();
};

exports.getUsersWithLocation = function (req, res, next) {
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
      errorOutput.errors.push({ meta: e });
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

exports.getNewUsers = function (req, res, next) {

  // req.query = parser.newUsers(req.query);
  // TODO where should be parser placed
  req.query = parser.parseQuery(req.query, parser.parametersDictionary);

  // console.log(p.parseQuery(req.query, parametersDictionary))

  const validate = ajv.compile(schema.newUsers.query);
  const valid = validate(req.query);

  if (!valid) {
    const errorOutput = ajv.errorsText(validate.errors);

    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.getNewUsersWithMyTags = function (req, res, next) {

  req.query = parser.parseQuery(req.query, parser.parametersDictionary);

  const validate = ajv.compile(schema.newUsersWithMyTags.query);
  const valid = validate(req.query);

  if (!valid) {
    const errorOutput = ajv.errorsText(validate.errors);

    return res.status(400).json(errorOutput);
  }

  return next();
};

/* exports.getNewUsers = function (req, res, next) {

  req.checkQuery(rules.newUsers);

  const errors = req.validationErrors();

  const errorOutput = { errors: [] };

  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};*/
