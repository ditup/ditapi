'use strict';

var path = require('path');
var Serializer = require('jsonapi-serializer').Serializer;
var config = require(path.resolve('./config/config'));

var newTagSerializer = new Serializer('tags', {
  attributes: ['tagname', 'description']
});

var tagSerializer = new Serializer('tags', {
  attributes: ['tagname', 'description'],
  keyForAttribute: 'camelCase',
  topLevelLinks: {
    self: (data) => `${config.url.all}/tags/${data.id}`
  }
});

exports.newTag = function (data) {
  var output = newTagSerializer.serialize(data);
  delete output.data.id;
  return output;
};

exports.tag = function (data) {
  return tagSerializer.serialize(data);
};
