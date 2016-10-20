'use strict';

var path = require('path');
var Serializer = require('jsonapi-serializer').Serializer;
var Deserializer = require('jsonapi-serializer').Deserializer;
var config = require(path.resolve('./config/config'));

exports.deserialize = new Deserializer().deserialize;

var serialize = {};

var newUserSerializer = new Serializer('users', {
  attributes: ['username', 'password', 'email']
});

var userSerializer = new Serializer('users', {
  attributes: ['givenName', 'familyName', 'username', 'description'],
  keyForAttribute: 'camelCase',
  topLevelLinks: {
    self: (data) => `${config.url.all}/users/${data.id}`
  }
});

serialize.newUser = function (data) {
  var output = newUserSerializer.serialize(data);
  delete output.data.id;
  return output;
};

serialize.user = function (data) {
  return userSerializer.serialize(data);
};

exports.serialize = serialize;

// express middleware for deserializing the data in body
exports.middleware = function (req, res, next) {
  exports.deserialize(req.body, function (err, resp) {
    if (err) return next(err); // TODO
    
    req.body = {};
    
    for(let key in resp) {
      req.body[key] = resp[key];
    }
    return next();
  });
};
