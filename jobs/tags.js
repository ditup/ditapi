'use strict';

const path = require('path'),
      models = require(path.resolve('./models'));

async function deleteAbandonedTags() {
  // returns a promise of a list of deleted tags
  return await models.tag.deleteAbandoned();
}

exports.deleteAbandoned = deleteAbandonedTags;
