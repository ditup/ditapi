'use strict';

let co = require('co');

exports.postUsers = function (req, res, next) {
  req.checkBody({
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
  });

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
    console.log(errors);
    return res.status(409).json({ errors: errors.map((e) => { return { meta: e }; }) });
  });
};
