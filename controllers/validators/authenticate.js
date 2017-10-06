'use strict';

const validate = require('./validate-by-schema');

const getAuthToken = validate('getAuthToken');

module.exports = {
  getAuthToken
};
