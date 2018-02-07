'use strict';

const comment = require('./comment'),
      contact = require('./contact'),
      idea = require('./idea'),
      ideaTag = require('./idea-tag'),
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

module.exports = Object.assign(models, { comment, contact, idea, ideaTag, message, model, tag, user, userTag });
