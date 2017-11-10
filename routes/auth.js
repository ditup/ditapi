'use strict';

const express = require('express'),
      path = require('path');

const authController = require(path.resolve('./controllers/authenticate-token')),
      authorize = require(path.resolve('./controllers/authorize')),
      validators = require(path.resolve('./controllers/validators'));

const router = express.Router();

router.route('/token')
  .get(validators.authenticate.getAuthToken, authController.generateToken);

router.route('/exp')
  .get(authorize.onlyLogged, authController.expire);

module.exports = router;
