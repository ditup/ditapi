'use strict';

const path = require('path'),
      _ = require('lodash');
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
    self: generateSelfLink
  }
});

exports.tag = function (data) {
  return tagSerializer.serialize(data);
};

function generateSelfLink(data) {
  if (_.isArray(data)) {
    const { urlParam } = data;
    return `${config.url.all}/tags?${urlParam}`;
  }

  return `${config.url.all}/tags/${data.id}`;
}
