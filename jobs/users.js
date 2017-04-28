'use strict';

const path = require('path'),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config'));

async function deleteUnverifiedUsers() {
  // returns a promise of a list of deleted tags
  const age = config.unverifiedUsersTTL;
  return await models.user.deleteUnverified(age);
}

exports.deleteUnverified = deleteUnverifiedUsers;
