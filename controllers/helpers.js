'use strict';

const _ = require('lodash');

/**
 * get a object with offset & limit from req.query.page or default
 *
 * @param {ExpressReq} req - express request object
 * @param {number} [offset] - integer, offset of results for pagination
 * @param {number} [limit] - integer, max results per page for pagination
 * @returns {Page} object containing offset and limit (provided or default)
 *
 */
function getPage(req, { offset = 0, limit = 10 } = {}) {
  offset = _.get(req, 'query.page.offset', offset);
  limit = _.get(req, 'query.page.limit', limit);

  return { offset, limit };
}

module.exports = { getPage };
