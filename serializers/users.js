'use strict';

const path = require('path'),
      _ = require('lodash');
const Serializer = require('jsonapi-serializer').Serializer;
const config = require(path.resolve('./config/config'));

const newUserSerializer = new Serializer('users', {
  attributes: ['username', 'password', 'email']
});
exports.newUser = function (data) {
  const output = newUserSerializer.serialize(data);
  delete output.data.id;
  return output;
};

const userSerializer = new Serializer('users', {
  attributes: ['givenName', 'familyName', 'username', 'description', 'email', 'location', 'preciseLocation', 'locationUpdated'],
  keyForAttribute: 'camelCase',
  topLevelLinks: {
    self: ({ id }) => `${config.url.all}/users/${id}`
  },
  id: 'username'
});
exports.user = function (data) {
  return userSerializer.serialize(data);
};

// serialize new userTag
const newUserTagSerializer = new Serializer('user-tags', {
  attributes: ['username', 'tagname', 'story', 'relevance']
});
exports.newUserTag = function (data) {
  return newUserTagSerializer.serialize(data);
};


// serialize userTags
const userTagsSerializer = new Serializer('user-tags', {
  attributes: ['username', 'tagname', 'story', 'relevance', 'user', 'tag'],
  keyForAttribute: 'camelCase',
  topLevelLinks: {
    self(data) {
      if(!Array.isArray(data)) {
        const { user: { username }, tag: { tagname } } = data;
        return `${config.url.all}/users/${username}/tags/${tagname}`;
      }
    }
  },
  tag: {
    ref: 'tagname',
    attributes: ['tagname'],
    includedLinks: {
      self: ({ tagname }) => `${config.url.all}/tags/${tagname}`
    },
    relationshipLinks: {}
  },
  user: {
    ref: 'username',
    attributes: ['givenName', 'familyName', 'username', 'description', 'location'],
    includedLinks: {
      self: ({ username }) => `${config.url.all}/users/${username}`
    },
    relationshipLinks: {}
  }

});

exports.userTag = function (data) {
  data.id = `${data.user.username}--${data.tag.tagname}`;
  data.username = data.user.username;
  data.tagname = data.tag.tagname;

  return userTagsSerializer.serialize(data);
};

exports.userTags = function ({ username, userTags }) {

  for (const userTag of userTags) {
    const username = userTag.user.username;
    const tagname = userTag.tag.tagname;
    userTag.id = `${username}--${tagname}`;
    userTag.username = username;
    userTag.tagname = tagname;
  }

  const serialized = userTagsSerializer.serialize(userTags);

  serialized.links = {
    self: `${config.url.all}/users/${username}/tags`
  };

  return serialized;
};

const usersByTagsSerializer = new Serializer('users', {
  attributes: ['givenName', 'familyName', 'username', 'description', 'tags'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'tags') {
      return 'user-tags';
    }
  },
  id: 'username',
  // include user-tags which were found
  tags: {
    ref: 'id',
    attributes: ['username', 'tagname', 'story', 'relevance', 'tag'],
    includedLinks: {
      self: (data, { username, tagname }) => `${config.url.all}/users/${username}/tags/${tagname}`
    },
    relationshipLinks: {
      self: ({ username }) => `${config.url.all}/users/${username}/relationships/tags`,
      related: ({ username }) => `${config.url.all}/users/${username}/tags`
    },
    tag: {
      ref: 'tagname',
      attributes: ['tagname'],
      includedLinks: {
        self: (data, { tagname }) => `${config.url.all}/tags/${tagname}`
      }
    }
  }
});
exports.usersByTags = function (users) {
  _.each(users, user => {
    user.tags = _.map(user.userTags, userTag => {

      userTag.id = `${user.username}--${userTag.tag.tagname}`;
      userTag.username = user.username;
      userTag.tagname = userTag.tag.tagname;
      return userTag;
    });
    delete user.userTags;
  });
  const serialized = usersByTagsSerializer.serialize(users);

  return serialized;
};

const usersByMyTagsSerializer = new Serializer('users', {
  attributes: ['givenName', 'familyName', 'username', 'description', 'tags'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'tags') {
      return 'user-tags';
    }
  },
  id: 'username',
  // include user-tags which were found
  tags: {
    ref: 'id',
    attributes: ['username', 'tagname', 'story', 'relevance', 'tag'],
    includedLinks: {
      self: (data, { username, tagname }) => `${config.url.all}/users/${username}/tags/${tagname}`
    },
    relationshipLinks: {
      self: ({ username }) => `${config.url.all}/users/${username}/relationships/tags`,
      related: ({ username }) => `${config.url.all}/users/${username}/tags`
    },
    tag: {
      ref: 'tagname',
      attributes: ['tagname'],
      includedLinks: {
        self: (data, { tagname }) => `${config.url.all}/tags/${tagname}`
      }
    }
  }
});
exports.usersByMyTags = function (users) {
  _.each(users, user => {
    user.tags = _.map(user.userTags, userTag => {

      userTag.id = `${user.username}--${userTag.tag.tagname}`;
      userTag.username = user.username;
      userTag.tagname = userTag.tag.tagname;
      return userTag;
    });
    delete user.userTags;
  });
  const serialized = usersByMyTagsSerializer.serialize(users);

  return serialized;
};

exports.usersWithTags = exports.usersByMyTags;
