'use strict';
const _ = require('lodash');

exports.newUsers = function (query) {

  // parsing needs to check if we are not producing NaN (not parsing different type to Int)
  // NaN is treated like number type by JSON schema
  if (!_.has(query, 'page')) {
    return query;
  }

  if (_.has(query.page, 'offset')) {
    const number = parseInt(query.page.offset);
    if (Number.isInteger(number))
      query.page.offset = number;
  }

  if (_.has(query.page, 'limit')) {
    const number = parseInt(query.page.limit);
    if (Number.isInteger(number))
      query.page.limit = number;
  }
  return query;
};