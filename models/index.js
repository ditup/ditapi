'use strict';

const model = require('./model'),
      tag = require('./tag'),
      user = require('./user'),
      userTag = require('./user-tag');


const models = {
  connect: function (params) {
    model.connect(params);
  },

  get db() {
    return model.db;
  }
};

models.user = user;
models.tag = tag;
models.userTag = userTag;
models.model = model;


module.exports = exports = models;
