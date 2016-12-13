'use strict';

let _ = require('lodash');

var rules = {
  user: {
    username: {
      notEmpty: true,
      matches: {
        options: [/^(?=.{2,32}$)[a-z0-9]+([_\-\.][a-z0-9]+)*$/]
      },
      errorMessage: 'Invalid Username (only a-z0-9.-_)' // Error message for the parameter
    },
    email: {
      notEmpty: true,
      isEmail: true,
      errorMessage: 'Invalid Email'
    },
    givenName: {
      isLength: {
        options: [{ max: 128 }]
      }
    },
    familyName: {
      isLength: {
        options: [{ max: 128 }]
      }
    },
    description: {
      isLength: {
        options: [{ max: 2048 }]
      }
    },
    get id() {
      return this.username
    }
  },

  tag: {
    tagname: {
      notEmpty: true,
      isLength: {
        options: [{ min: 2, max: 64 }]
      },
      matches: {
        options: [/^[a-z0-9]+(\-[a-z0-9]+)*$/]
      },
      errorMessage: 'Invalid Tagname (2-64 characters; only a-z, -, i.e. tag-name; but not -tag-name, tag--name, tagname-)'
    },
    description: {
      isLength: {
        options: [{ min: 0, max: 2048 }]
      }
    }
  }
};

exports.postUsers = function (req, res, next) {
  req.checkBody(_.pick(rules.user, ['username', 'email']));

  // prepare and return errors
  var errors = req.validationErrors();

  var errorOutput = { errors: [] };
  if (errors) {
    for(let e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.getUser = function (req, res, next) {
  req.checkParams(_.pick(rules.user, ['username']));

  var errors = req.validationErrors();

  var errorOutput = { errors: [] };

  if (errors) {
    for(let e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.patchUser = function (req, res, next) {
  req.checkParams(_.pick(rules.user, ['username']));
  req.checkBody(_.pick(rules.user, ['id', 'givenName', 'familyName', 'description']));
  var errors = req.validationErrors();

  var errorOutput = { errors: [] };
  if (errors) {
    for(let e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.postTags = function (req, res, next) {
  req.checkBody(rules.tag);

  var errors = req.validationErrors();

  var errorOutput = { errors: [] };
  if (errors) {
    for(let e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.getTag = function (req, res, next) {
  req.checkParams(_.pick(rules.tag, ['tagname']));

  var errors = req.validationErrors();

  var errorOutput = {errors: []};
  if (errors) {
    for(let e of errors) {
      errorOutput.errors.push({meta: e});
    }

    return res.status(400).json(errorOutput);
  }
  return next();
};

exports.postUserTags = function (req, res, next) {
  return next();
};
