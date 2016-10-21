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
exports.deserialize = new Deserializer().deserialize;

// express middleware for deserializing the data in body
exports.middleware = function (req, res, next) {
  exports.deserialize(req.body, function (err, resp) {
    if (err) return next(err); // TODO
    
    req.body = {};
    
    for(let key in resp) {
      req.body[key] = resp[key];
    }
    return next();
  });
};

