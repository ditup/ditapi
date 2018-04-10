'use strict';

const comment = require('./comment'),
      contact = require('./contact'),
      dit = require('./dit'),
      idea = require('./idea'),
      ideaTag = require('./idea-tag'),
      message = require('./message'),
      model = require('./model'),
      tag = require('./tag'),
      user = require('./user'),
      userTag = require('./user-tag'),
      vote = require('./vote');


const models = {
  connect: function (params) {
    model.connect(params);
  },

  get db() {
    return model.db;
  }
};

module.exports = Object.assign(models, { comment, contact, dit, idea, ideaTag, message, model, tag, user, userTag, vote });
