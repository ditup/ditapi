'use strict';

const _ = require('lodash');

const rules = require('./rules');

exports.post = function (req, res, next) {
  req.body.body = req.body.body.trim();
  req.checkBody(_.pick(rules.message, ['body']));

  // prepare and return errors
  let errors = req.validationErrors();


  // check whether the receiver is different from sender
  const isSenderEqualReceiver = req.body.to.username === req.auth.username;

  if (isSenderEqualReceiver) {
    errors = errors || [];
    errors.push({
      param: 'to',
      msg: 'Receiver can\'t be the sender',
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
