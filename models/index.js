'use strict';

let arangojs = require('arangojs');

let model = require('./model'),
    tag = require('./tag'),
    user = require('./user');


let models = {
  connect: function (params) {
    model.connect(params);
  },

  get db() {
    return model.db;
  }
};

models.user = user;
models.tag = tag;
models.model = model;


module.exports = exports = models;
