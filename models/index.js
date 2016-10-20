'use strict';

let arangojs = require('arangojs');

let model = require('./model');
let user = require('./user');

let models = {
  connect: function (params) {
    model.connect(params);
  },

  get db() {
    return model.db;
  }
};

models.user = user;
models.model = model;


module.exports = exports = models;
