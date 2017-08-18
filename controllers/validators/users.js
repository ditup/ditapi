'use strict';

const _ = require('lodash');

const parser = require('./parser'),
      schema = require('./schema'),
      { ajv } = require('./ajvInit');

const validate = require('./validate-by-schema');

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

const get = validate('getUser');
const patch = validate('patchUser');

exports.get = get;
exports.patch = patch;

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
