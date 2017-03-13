'use strict';

const express = require('express'),
      path = require('path');

const userController = require(path.resolve('./controllers/users'));

const router = express.Router();

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
