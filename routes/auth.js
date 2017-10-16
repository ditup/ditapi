'use strict';

const express = require('express'),
      path = require('path');

const userController = require(path.resolve('./controllers/users')),
      authController = require(path.resolve('./controllers/authenticate-token')),
      validators = require(path.resolve('./controllers/validators'));

const router = express.Router();

router.route('/token')
  .get(validators.authenticate.getAuthToken, authController.generateToken);


module.exports = router;
