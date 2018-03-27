'use strict';

const Deserializer = require('jsonapi-serializer').Deserializer;

const comments = require('./comments'),
      contacts = require('./contacts'),
      ideas = require('./ideas'),
      ideaTags = require('./idea-tags'),
      messages = require('./messages'),
      tags = require('./tags'),
      users = require('./users'),
      votes = require('./votes');

// deserializing
const deserializer = new Deserializer({
  keyForAttribute: 'camelCase',
  users: {
    valueForRelationship: function (relationship) {
      return {
        username: relationship.id
      };
    }
  },
  tags: {
    valueForRelationship: function (relationship) {
      return {
        tagname: relationship.id
      };
    }
  }
});

// express middleware for deserializing the data in body
function deserialize(req, res, next) {
  deserializer.deserialize(req.body, function (err, resp) {
    if (err) return next(err); // TODO

    req.rawBody = req.body;

    req.body = resp;

    return next();
  });
}

module.exports = {
  serialize: Object.assign({ }, comments, contacts, ideas, ideaTags, messages, tags, users, votes),
  deserialize
};
