'use strict';

let path = require('path'),
    _ = require('lodash');
let Serializer = require('jsonapi-serializer').Serializer;
let config = require(path.resolve('./config/config'));

var newUserSerializer = new Serializer('users', {
  attributes: ['username', 'password', 'email']
});
exports.newUser = function (data) {
  var output = newUserSerializer.serialize(data);
  delete output.data.id;
  return output;
};

var userSerializer = new Serializer('users', {
  attributes: ['givenName', 'familyName', 'username', 'description', 'email'],
  keyForAttribute: 'camelCase',
  topLevelLinks: {
    self: ({ id }) => `${config.url.all}/users/${id}`
  }
});
exports.user = function (data) {
  return userSerializer.serialize(data);
};

// serialize new userTag
var newUserTagSerializer = new Serializer('tags', {
  attributes: ['username', 'tagname', 'story']
});
exports.newUserTag = function (data) {
  return newUserTagSerializer.serialize(data);
};

// serialize userTag
var userTagSerializer = new Serializer('tags', {
  meta: {
  }, // ({ story, created }) => { story, created },
  topLevelLinks: {
    self: ({ user, tag }) => `${config.url.all}/users/${user.username}/relationships/tags/${tag.tagname}`,
    related: ({ user, tag }) => `${config.url.all}/users/${user.username}/tags/${tag.tagname}`

  }
});
exports.userTag = function (data) {
  let serialized = userTagSerializer.serialize(data);
  let meta = _.pick(data, ['created', 'story']);
  _.assign(serialized, { meta });
  return serialized;
};

// serialize userTags
var userTagsSerializer = new Serializer('tags', {});
exports.userTags = function ({ username, userTags }) {
  let serialized = userTagsSerializer.serialize(userTags);

  serialized.links = {
    self: `${config.url.all}/users/${username}/relationships/tags`,
    related: `${config.url.all}/users/${username}/tags`
  };

  return serialized;
};
