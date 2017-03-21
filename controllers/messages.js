'use strict';

const path = require('path'),
      _ = require('lodash'),
      config = require(path.resolve('./config/config')),
      serialize = require(path.resolve('./serializers')).serialize,
      models = require(path.resolve('./models'));

/*
 * controller for POST /messages
 */
exports.postMessages = async function (req, res, next) {
  try {
    // message body and receiver should be provided
    const { body, to: { username: to } } = req.body;

    // message sender is the authorized user
    const from = req.auth.username;

    // save the message
    const message = await models.message.create({ from, to, body });

    // the receiver was not found (message not created)
    if (message === null) return next();

    const serializedMsg = serialize.message(message);

    const selfLink = serializedMsg.links.self;
    return res.status(201)
      .set('Location', selfLink)
      .json(serializedMsg);
  } catch (e) {
    return next(e);
  }
};

/*
 * controller for GET /messages
 */
exports.getMessages = async function (req, res, next) {

  // get a thread of the logged user with another user
  if(_.has(req, 'query.filter.with')) {

    // one user is me (the logged user)
    const me = req.auth.username;
    // the other user is provided in query ?filter[with]=:username
    const withUser = req.query.filter.with;

    // get the messages
    let messages;
    try {
      messages = await models.message.readThread(me, withUser);
    } catch (e) {
      if(e.status === 404) return next(e);

      throw e;
    }

    const serializedMessages = serialize.message(messages);

    serializedMessages.links.self = `${config.url.all}/messages?filter[with]=${withUser}`;

    const selfLink = serializedMessages.links.self;

    return res.status(200)
      .set('Location', selfLink)
      .json(serializedMessages);
  }

};
