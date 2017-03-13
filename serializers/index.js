'use strict';


const _ = require('lodash');
const Deserializer = require('jsonapi-serializer').Deserializer;

const users = require('./users'),
      tags = require('./tags');

// _.assign(module.exports, users);
const serialize = {};
_.assign(serialize, tags, users);

exports.serialize = serialize;


// deserializing
const deserialize = new Deserializer({
  keyForAttribute: 'camelCase'
}).deserialize;

// express middleware for deserializing the data in body
exports.deserialize = function (req, res, next) {
  deserialize(req.body, function (err, resp) {
    if (err) return next(err); // TODO

    req.body = {};

    for(const key in resp) {
      req.body[key] = resp[key];
    }
    return next();
  });
};
