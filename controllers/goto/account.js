'use strict';

const route = require('./goto');

module.exports = {
  changePassword: route(['body.password', 'body.oldPassword']),
  resetPassword: route(['query.reset-password']),
  updateResetPassword: route(['body.password', 'body.code']),
  updateUnverifiedEmail: route(['body.email']),
  verifyEmail: route(['body.emailVerificationCode'])
};
