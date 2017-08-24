'use strict';

// this router is used to deserialize the data from the body of all
// POST and PATCH requests

const express = require('express');
const path = require('path');
const router = express.Router();

const serializers = require(path.resolve('./serializers'));

function notMultipart(req, res, next) {
  // if the request is multipart/form-data, don't deserialize.
  const isMultipart = /^multipart\/form-data/.test(req.headers['content-type']);

  if (isMultipart) {
    return next('route');
  }

  return next();
}

// a basic check for the validity of request body
function checkData(req, res, next) {

  // check jsonapi data
  if (!req.body.data) {
    const e = new Error();
    e.status = 400;
    throw e;
  }
  return next();
}

// deserialize body of POST and PATCH requests
router.route('*').all(notMultipart) // don't try to deserialize multipart/form-data
  .post(checkData, serializers.deserialize)
  .patch(checkData, serializers.deserialize);

module.exports = router;
