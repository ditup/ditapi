'use strict';

const path = require('path'),
      models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

/**
 * Create idea
 */
async function post(req, res, next) {
  try {

    // gather data
    const { title, detail } = req.body;
    const creator = req.auth.username;

    // save the idea to database
    const newIdea = await models.idea.create({ title, detail, creator });

    // serialize the idea (JSON API)
    const serializedIdea = serialize.idea(newIdea);

    // respond
    return res.status(201).json(serializedIdea);

  } catch (e) {
    return next(e);
  }
}

module.exports = { post };



