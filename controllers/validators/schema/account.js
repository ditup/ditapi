'use strict';

const { username, email, code, password } = require('./paths');

const resetPassword = {
  id: 'resetPassword',
  properties: {
    body: {
      type: 'object',
      properties: {
        id: {
          anyOf: [username, email]
        }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const updateResetPassword = {
  id: 'updateResetPassword',
  properties: {
    body: {
      properties: {
        id: username,
        code,
        password
      }
    }
  },
  required: ['body']
};

const updateUnverifiedEmail = {
  id: 'updateUnverifiedEmail',
  properties: {
    body: {
      properties: {
        email,
        password,
        id: username
      },
      required: ['email', 'password', 'id'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const verifyEmail = {
  id: 'verifyEmail',
  properties: {
    body: {
      properties: {
        emailVerificationCode: code,
        id: username
      },
      required: ['emailVerificationCode', 'id'],
      additionalProperties: false // untested
    }
  },
  required: ['body']
};

const changePassword = {
  id: 'changePassword',
  properties: {
    body: {
      properties: {
        password,
        oldPassword: {
          type: 'string',
          maxLength: 512
        },
        id: username
      },
      required: ['password', 'oldPassword', 'id'],
      additionalProperties: false
    }
  },
  required: ['body']
};
module.exports = { resetPassword, updateResetPassword, updateUnverifiedEmail, verifyEmail, changePassword };
