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

// change email (it will change the unverified email)
// the verified email will be overwritten when the unverified one is verified
router.route('/')
  .patch(accountController.gotoUpdateUnverifiedEmail, auth.onlyLogged, validators.account.updateUnverifiedEmail, accountController.updateUnverifiedEmail);

/**
 * Email verification
 */
router.route('/')
  .patch(accountController.gotoVerifyEmail, validators.account.verifyEmail, accountController.verifyEmail);

/**
 * Changing password
 */
router.route('/')
  .patch(accountController.gotoChangePassword, auth.onlyLogged, validators.account.changePassword, accountController.changePassword);

module.exports = router;
