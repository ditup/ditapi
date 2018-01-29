'use strict';

const Deserializer = require('jsonapi-serializer').Deserializer;

const contacts = require('./contacts'),
      ideas = require('./ideas'),
      messages = require('./messages'),
      tags = require('./tags'),
      users = require('./users');

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
  serialize: Object.assign({ }, contacts, ideas, messages, tags, users),
  deserialize
};
