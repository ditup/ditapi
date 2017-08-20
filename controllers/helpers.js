'use strict';

const _ = require('lodash');

// get a object with offset & limit from req.query.page or default
function getPage(req, defaultPage) {
  defaultPage = defaultPage || {};

  const offset = _.get(req, 'query.page.offset', defaultPage.offset || 0);
  const limit = _.get(req, 'query.page.limit', defaultPage.limit || 10);

  return { offset, limit };
}

module.exports = { getPage };
