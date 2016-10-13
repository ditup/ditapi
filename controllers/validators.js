'use strict';

exports.postUsers = function (req, res, next) {
  req.checkBody({
    username: {
      notEmpty: true,
      matches: {
        options: [/^(?=.{2,32}$)[a-z0-9]+([_\-\.][a-z0-9]+)*$/]
      },
      errorMessage: 'Invalid Username (only a-z0-9.-_)' // Error message for the parameter
    }
  });

  var errors = req.validationErrors();

  if (errors) {
    var errorOutput = {errors: []};
    for(let e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};
