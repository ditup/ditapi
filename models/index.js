'use strict';

let arangojs = require('arangojs');

let model = require('./model');
let user = require('./user');

let models = {
  connect: function (params) {
    model.connect(params);
  }
};

models.user = user;


module.exports = exports = models;
