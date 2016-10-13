'use strict';

var path = require('path'),
    serialize = require(path.resolve('./serializers')).serialize;

exports.postUsers = function (req, res) {
  // validate users
  // save users
  // respond
  res.status(201).json(serialize.user({
    id: req.body.username,
    username: req.body.username
  }));
}
