'use strict';

var express = require('express');
var router = express.Router();
var path = require('path');
var userController = require(path.resolve('./controllers/users'));
var validators = require(path.resolve('./controllers/validators')),
    authorize = require(path.resolve('./controllers/authorize'));

// basic authenticator
router.route('/basic')
  .get(function (req, res, next) {
    if (req.auth.logged === true || req.auth.loggedUnverified === true) {
      // prepare to fetch logged user (prepare for userController.getUser)
      req.params.username = req.auth.username;
      return next();
    }
    return res.status(401).json({ errors: ['Not Authorized'] });
  }, userController.getUser);

module.exports = router;
