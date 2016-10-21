'use strict';

let co = require('co');

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
        options: [{ min: 0, max: 2048}]
      }
    }
  }
};

exports.postUsers = function (req, res, next) {
  req.checkBody(rules.user);

  var errors = req.validationErrors();

  var errorOutput = {errors: []};
  if (errors) {
    for(let e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  req.checkBody('username', 'Username Not Available').isUsernameAvailable();
  req.checkBody('email', 'Email Not Available').isEmailAvailable();

  return co(function * () {
    var asyncErrors = yield req.asyncValidationErrors();
    return next();
  })
  .catch(function (errors) {
    return res.status(409).json({ errors: errors.map((e) => { return { meta: e }; }) });
  });
};

exports.getUser = function (req, res, next) {
  req.checkParams({
    username: rules.user.username
  });

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

exports.postTags = function (req, res, next) {
  req.checkBody(rules.tag);

  var errors = req.validationErrors();

  var errorOutput = {errors: []};
  if (errors) {
    for(let e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  req.checkBody('tagname', 'Tagname Already Exists').isTagnameAvailable();

  return co(function * () {
    var asyncErrors = yield req.asyncValidationErrors();
    return next();
  })
  .catch(function (errors) {
    return res.status(409).json({ errors: errors.map((e) => { return { meta: e }; }) });
  });
};
