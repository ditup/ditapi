'use strict';

var path = require('path');
var Serializer = require('jsonapi-serializer').Serializer;
var config = require(path.resolve('./config/config'));

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

exports.newUser = function (data) {
  var output = newUserSerializer.serialize(data);
  delete output.data.id;
  return output;
};

exports.user = function (data) {
  return userSerializer.serialize(data);
};
