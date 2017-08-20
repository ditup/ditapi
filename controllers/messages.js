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

  if (_.has(req, 'query.filter.with')) {
    /*
     * Get a conversation of the logged user with another user (with: username)
     */

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

    const selfLink = `${config.url.all}/messages?filter[with]=${withUser}`;
    serializedMessages.links.self = selfLink;

    return res.status(200)
      .set('Location', selfLink)
      .json(serializedMessages);
  } else if (_.has(req, 'query.filter.threads')) {
    /*
     * Get the last messages of my threads
     */

    // who am i?
    const me = req.auth.username;

    // what are last messages of my threads?
    const messages = await models.message.readThreads(me);

    const serializedMessages = serialize.message(messages);

    const selfLink = `${config.url.all}/messages?filter[threads]`;

    serializedMessages.links.self = selfLink;

    return res.status(200)
      .set('Location', selfLink)
      .json(serializedMessages);

  } else if (_.has(req, 'query.filter.count')) {
    /*
     * Get the last messages of my threads
     */

    // who am i?
    const me = req.auth.username;

    // count amount of my threads which contain messages unread by me
    const unread = await models.message.countUnreadThreads(me);

    const selfLink = `${config.url.all}/messages?filter[count]`;

    const responseBody = {
      meta: {
        unread
      },
      links: {
        self: selfLink
      }
    };

    return res.status(200)
      .set('Location', selfLink)
      .json(responseBody);

  } else {
    return next(); // go to 404, Not Found TODO check if that is the correct method
  }

};

exports.patchMessage = async function (req, res, next) {
  const me = req.auth.username;

  const { id } = req.body;

  if (req.body.hasOwnProperty('read') && req.body.read === true) {
    // update messages to read: true
    let messages;
    try {
      messages = await models.message.updateRead(id, me);
    } catch (e) {
      /* handle error */
      if (e.status === 403) return next(e);
      throw e;
    }

    const serializedMessages = serialize.message(messages);

    delete serializedMessages.links.self;

    return res.status(200)
      .json(serializedMessages);
  }

  return next();
};
