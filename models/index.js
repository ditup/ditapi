'use strict';

const contact = require('./contact'),
      idea = require('./idea'),
      message = require('./message'),
      model = require('./model'),
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

module.exports = Object.assign(models, { contact, idea, message, model, tag, user, userTag });
