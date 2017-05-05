'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const accountController = require(path.resolve('./controllers/account'));
const validators = require(path.resolve('./controllers/validators'));

// post a new user
router.route('/')
  .patch(accountController.gotoResertPassword, validators.account.resetPassword, accountController.resetPassword);

router.route('/')
  .patch(accountController.gotoUpdateResetPassword, validators.account.updateResetPassword, accountController.updateResetPassword);

module.exports = router;
