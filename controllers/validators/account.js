const validate = require('./validate-by-schema');

const changePassword = validate('changePassword', [['auth.username', 'body.id']]);
const resetPassword = validate('resetPassword');
const updateResetPassword = validate('updateResetPassword');
const updateUnverifiedEmail = validate('updateUnverifiedEmail', [['auth.username', 'body.id']]);
const verifyEmail = validate('verifyEmail');

module.exports = { resetPassword, updateResetPassword, updateUnverifiedEmail, verifyEmail, changePassword };
