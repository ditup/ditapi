'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const accountController = require(path.resolve('./controllers/account'));
const validators = require(path.resolve('./controllers/validators'));
const auth = require(path.resolve('./controllers/authorize'));

// request an email with password-reset code (link)
router.route('/')
  .patch(accountController.gotoResertPassword, validators.account.resetPassword, accountController.resetPassword);

// update password via password-reset code
router.route('/')
  .patch(accountController.gotoUpdateResetPassword, validators.account.updateResetPassword, accountController.updateResetPassword);

// change email
router.route('/')
  .patch(accountController.gotoUpdateUnverifiedEmail, auth.onlyLogged, validators.account.updateUnverifiedEmail, accountController.updateUnverifiedEmail);

module.exports = router;
