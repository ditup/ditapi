'use strict';

var path = require('path');
var Serializer = require('jsonapi-serializer').Serializer;
var config = require(path.resolve('./config/config'));

var newTagSerializer = new Serializer('tags', {
  attributes: ['tagname', 'description']
});
exports.newTag = function (data) {
  var output = newTagSerializer.serialize(data);
  delete output.data.id;
  return output;
};

var tagSerializer = new Serializer('tags', {
  id: 'tagname',
  attributes: ['tagname', 'description'],
  keyForAttribute: 'camelCase',
  topLevelLinks: {
    self: (data) => `${config.url.all}/tags/${data.id}`
  }
});
exports.tag = function (data) {
  return tagSerializer.serialize(data);
};
