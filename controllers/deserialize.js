'use strict';

// this router is used to deserialize the data from the body of all
// POST and PATCH requests

const express = require('express');
const path = require('path');
const router = express.Router();

const serializers = require(path.resolve('./serializers'));


// a basic check for the validity of request body
function checkData (req, res, next) {
  if (!req.body.data) {
    const e = new Error();
    e.status = 400;
    throw e;
  }
  return next();
}

// deserialize body of POST and PATCH requests
router.route('*')
  .post(checkData, serializers.deserialize)
  .patch(checkData, serializers.deserialize);

module.exports = router;
