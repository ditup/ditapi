'use strict';


const _ = require('lodash');
const Deserializer = require('jsonapi-serializer').Deserializer;

const users = require('./users'),
      tags = require('./tags'),
      contacts = require('./contacts'),
      messages = require('./messages');
// _.assign(module.exports, users);
const serialize = {};
_.assign(serialize, tags, users, contacts, messages);

exports.serialize = serialize;


// deserializing
const deserialize = new Deserializer({
  keyForAttribute: 'camelCase',
  users: {
    valueForRelationship: function (relationship) {
      return {
        username: relationship.id
      };
    }
  }
}).deserialize;

// express middleware for deserializing the data in body
exports.deserialize = function (req, res, next) {
  deserialize(req.body, function (err, resp) {
    if (err) return next(err); // TODO

    req.rawBody = req.body;

    req.body = resp;

    return next();
  });
};
