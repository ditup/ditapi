'use strict';

const _ = require('lodash');

const rules = require('./rules');

exports.post = function (req, res, next) {
  let errors = [];

  // check if the body has and only has the expected attributes
  const expectedAttrs = ['trust', 'reference', 'message', 'to'];
  const attrs = Object.keys(req.body);
  const missingAttrs = _.difference(expectedAttrs, attrs);

  const invalidAttrs = _.difference(attrs, expectedAttrs);

  if (missingAttrs.length > 0) {
    errors.push({
      msg: 'incomplete request',
      value: `missing attributes: ${missingAttrs.join(', ')}`
    });
  }

  if (invalidAttrs.length > 0) {
    errors.push({
      msg: 'invalid request',
      value: `invalid attributes: ${invalidAttrs.join(', ')}`
    });
  }

  // check that the target username is valid
  req.body.username = req.body.to.username;
  req.checkBody(_.pick(rules.user, ['username']));
  delete req.body.username;

  // check that reference and message is valid
  req.checkBody(_.pick(rules.contact, ['reference', 'message']));

  // check that trust level is valid
  if (!validateTrust(req.body.trust)) errors.push({
    param: 'trust',
    msg: 'the trust level is invalid',
    value: req.body.trust
  });

  // prepare and return errors
  errors = errors.concat(req.validationErrors() || []);

  // check whether the contact is not sent to self
  const isToSelf = req.body.to.username === req.auth.username;

  if (isToSelf) {
    errors.push({
      param: 'to',
      msg: 'you cannot create a contact to yourself',
      value: req.body.to.username
    });
  }

  const errorOutput = { errors: [] };
  if (_.isArray(errors) && errors.length > 0) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.patchConfirm = function (req, res, next) {
  let errors = [];

  // check if the body has and only has the expected attributes
  const expectedAttrs = ['trust', 'reference', 'isConfirmed', 'id'];
  const attrs = Object.keys(req.body);
  const missingAttrs = _.difference(expectedAttrs, attrs);
  const invalidAttrs = _.difference(attrs, expectedAttrs);

  if (missingAttrs.length > 0) {
    errors.push({
      msg: 'incomplete request',
      value: `missing attributes: ${missingAttrs.join(', ')}`
    });
  }

  if (invalidAttrs.length > 0) {
    errors.push({
      msg: 'invalid request',
      value: `invalid attributes: ${invalidAttrs.join(', ')}`
    });
  }

  // check that query params match jsonapi document id
  const { from: queryFrom, to: queryTo } = req.params;
  const [from, to] = req.body.id.split('--');

  const matchFromTo = queryFrom === from && queryTo === to;
  if (!matchFromTo) {
    errors.push({
      param: 'id',
      msg: 'document id doesn\'t match the url parameters',
      value: req.body.id
    });
  }

  // check that the target username is valid
  req.body.username = to;
  req.checkBody(_.pick(rules.user, ['username']));
  delete req.body.username;

  // check that reference is valid
  req.checkBody(_.pick(rules.contact, ['reference']));

  // check that trust level is valid
  const isTrustValid = [1, 2, 4, 8].indexOf(req.body.trust) > -1;
  if(!isTrustValid) {
    errors.push({
      param: 'trust',
      msg: 'the trust level is invalid',
      value: req.body.trust
    });
  }

  // check that trust level is valid
  const isConfirmedValid = req.body.isConfirmed === true;
  if(!isConfirmedValid) {
    errors.push({
      param: 'isConfirmed',
      msg: 'isConfirmed must be true (we can only confirm the contact (use DELETE to refuse the contact))',
      value: req.body.isConfirmed
    });
  }

  // prepare and return errors
  errors = errors.concat(req.validationErrors() || []);


  if (errors.length > 0) {

    const errorOutput = { errors: [] };

    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

/**
 * Validators for updating a contact
 *
 * Rules:
 * - id in body needs to match url
 * - contact needs to belong to me (i must be the originator)
 * - only expected attributes
 * - attributes need to be valid
 *
 */
exports.patchUpdate = function (req, res, next) {
  const { from, to } = req.params;
  const [fromBody, toBody] = req.body.id.split('--');
  // id should match url
  const idMatchesUrl = from === fromBody && to === toBody;

  let errors = [];

  if (!idMatchesUrl) {
    return res.status(400).json({
      errors: [{ meta: 'id doesn\'t match url' }]
    });
  }

  // when the contact doesn't belong to me, i should be Forbidden
  const belongsToMe = from === req.auth.username;
  if (!belongsToMe) {
    return res.status(403).end();
  }

  // when some invalid attributes are present, error 400
  const validAttrs = ['trust', 'reference', 'message', 'id'];
  const presentAttrs = Object.keys(req.body);
  const invalidAttrs = _.difference(presentAttrs, validAttrs);
  if (invalidAttrs.length > 0) {
    return res.status(400).json({
      errors: [
        { meta: 'invalid attributes provided' }
      ]
    });
  }

  // check that trust is valid
  if (_.has(req.body, 'trust') && !validateTrust(req.body.trust)) {
    errors.push('trust is invalid');
  }

  // check that reference and message is valid
  req.checkBody(_.pick(rules.contact, ['reference', 'message']));

  // prepare and return errors
  errors = errors.concat(req.validationErrors() || []);

  errors = _.map(errors, (err) => {
    switch(err.param) {
      case 'reference': {
        return 'reference is invalid';
      }
      case 'message': {
        return 'message is invalid (too long)';
      }
      default:
        return err;
    }
  });

  const errorOutput = { errors: [] };
  if (_.isArray(errors) && errors.length > 0) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.getOne = function (req, res, next) {
  let errors = [];

  // check that reference is valid
  req.checkParams({
    from: rules.user.username,
    to: rules.user.username
  });

  // prepare and return errors
  errors = errors.concat(req.validationErrors() || []);


  if (errors.length > 0) {

    const errorOutput = { errors: [] };

    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

/**
 * Provided trust, check that it is valid
 * @param {any} trust - a value to be validated
 * @returns boolean - true when valid, otherwise false
 */
function validateTrust(trust) {
  // check that trust level is valid
  return [1, 2, 4, 8].indexOf(trust) > -1;
}
