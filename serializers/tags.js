'use strict';

const path = require('path');
const Serializer = require('jsonapi-serializer').Serializer;
const config = require(path.resolve('./config/config'));

const newTagSerializer = new Serializer('tags', {
  attributes: ['tagname']
});
exports.newTag = function (data) {
  const output = newTagSerializer.serialize(data);
  delete output.data.id;
  return output;
};

const tagSerializer = new Serializer('tags', {
  id: 'tagname',
  attributes: ['tagname'],
  keyForAttribute: 'camelCase',
  topLevelLinks: {
    self: (data) => `${config.url.all}/tags/${data.id}`
  }
});
exports.tag = function (data) {
  return tagSerializer.serialize(data);
};
