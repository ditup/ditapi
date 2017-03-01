'use strict';

const path = require('path');
const Serializer = require('jsonapi-serializer').Serializer;
const config = require(path.resolve('./config/config'));

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
var newUserTagSerializer = new Serializer('user-tags', {
  attributes: ['username', 'tagname', 'story', 'relevance']
});
exports.newUserTag = function (data) {
  return newUserTagSerializer.serialize(data);
};

// serialize userTag
var userTagSerializer = new Serializer('user-tags', {
  attributes: ['username', 'tagname', 'story', 'relevance'],
  topLevelLinks: {
    self: ({ user, tag }) => `${config.url.all}/users/${user.username}/tags/${tag.tagname}`
  }
});
exports.userTag = function (data) {
  data.id = `${data.user.username}--${data.tag.tagname}`;
  data.username = data.user.username;
  data.tagname = data.tag.tagname;

  return userTagSerializer.serialize(data);
};

// serialize userTags
var userTagsSerializer = new Serializer('user-tags', {
  attributes: ['username', 'tagname', 'story', 'relevance', 'tag'],
  tag: {
    ref: 'tagname',
    attributes: ['tagname', 'description'],
    includedLinks: {
      self: ({ tagname }) => `${config.url.all}/tags/${tagname}`
    },
    relationshipLinks: {}
  }

});
exports.userTags = function ({ username, userTags }) {

  for (let userTag of userTags) {
    const username = userTag.user.username;
    const tagname = userTag.tag.tagname;
    userTag.id = `${username}--${tagname}`;
    userTag.username = username;
    userTag.tagname = tagname;
  }

  let serialized = userTagsSerializer.serialize(userTags);

  serialized.links = {
    self: `${config.url.all}/users/${username}/tags`
  };

  return serialized;
};
