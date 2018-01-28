'use strict';

const path = require('path');

const models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

/**
 * Controller for POST /ideas/:id/tags
 * Adds a tag to an idea
 */
async function post(req, res, next) {
  try {
    // gather data from request
    const { tagname } = req.body.tag;
    const ideaId = req.params.id;
    const username = req.auth.username;

    // save new idea-tag to database
    const newIdeaTag = await models.ideaTag.create(ideaId, tagname, { }, username);

    // serialize response body
    const responseBody = serialize.ideaTag(newIdeaTag);

    // respond
    return res.status(201).json(responseBody);
  } catch (e) {
    return next(e);
  }
}

module.exports = { post };
