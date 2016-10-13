'use strict';

var Serializer = require('jsonapi-serializer').Serializer;
var Deserializer = require('jsonapi-serializer').Deserializer;

exports.deserialize = new Deserializer().deserialize;

var serialize = {};

var newUserSerializer = new Serializer('users', {
  attributes: ['username', 'password', 'email']
});

var userSerializer = new Serializer('users', {
  attributes: ['givenName', 'familyName', 'username', 'description']
})

serialize.newUser = function (data) {
  var output = newUserSerializer.serialize(data);
  delete output.data.id;
  return output;
}

serialize.user = function (data) {
  return userSerializer.serialize(data);
}

exports.serialize = serialize;

exports.middleware = function (req, res, next) {
  exports.deserialize(req.body, function (err, resp) {
    if (err) return next(err); // TODO
    
    req.body = {};
    
    for(let key in resp) {
      req.body[key] = resp[key];
    }
    return next();
  });
}
