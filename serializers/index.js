'use strict';


let _ = require('lodash');
let Deserializer = require('jsonapi-serializer').Deserializer;

let users = require('./users'),
    tags = require('./tags');

//_.assign(module.exports, users);
let serialize = {};
_.assign(serialize, tags, users);

exports.serialize = serialize;


// deserializing
let deserialize = new Deserializer({
  keyForAttribute: 'camelCase'
}).deserialize;

// express middleware for deserializing the data in body
exports.deserialize = function (req, res, next) {
  deserialize(req.body, function (err, resp) {
    if (err) return next(err); // TODO

    req.body = {};
    
    for(let key in resp) {
      req.body[key] = resp[key];
    }
    return next();
  });
};
