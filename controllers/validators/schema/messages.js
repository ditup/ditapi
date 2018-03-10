'use strict';

const { username, id, messageBody } = require('./paths');

const postMessages = {
  properties: {
    body: {
      properties: {
        body: messageBody,
        to: {
          properties: {
            username
          },
          required: ['username']
        }
      },
      required: ['body', 'to']
    }
  }
};

const patchMessage = {
  properties: {
    body: {
      properties: {
        read: {
          enum: [true]
        },
        id
      },
      required: ['id', 'read'],
      additionalProperties: false
    }
  },
  required: ['body']
};

module.exports = { postMessages, patchMessage };
