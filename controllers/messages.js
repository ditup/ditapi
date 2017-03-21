'use strict';

const path = require('path'),
      config = require(path.resolve('./config/config')),
      serialize = require(path.resolve('./serializers')).serialize,
      models = require(path.resolve('./models'));

/**
 * Create a new tag
 *
 */
// controller for POST /messages
exports.postMessages = async function (req, res, next) {
  try {
    const { body, to: { username: to } } = req.body;
    const from = req.auth.username;

    const message = await models.message.create({ from, to, body });

    if (message === null) return next();

    const serializedMsg = serialize.message(message);

    const id = 'id';
    const selfLink = `${config.url.all}/messages/${id}`;
    return res.status(201)
      .set('Location', selfLink)
      .json(serializedMsg);
  } catch (e) {
    return next(e);
  }
};
