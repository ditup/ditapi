'use strict';

// this router is used to deserialize the data from the body of all
// POST and PATCH requests

let express = require('express');
let path = require('path');
let router = express.Router();

let serializers = require(path.resolve('./serializers'));


// a basic check for the validity of request body
function checkData (req, res, next) {
  if (!req.body.data) {
    let e = new Error();
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
