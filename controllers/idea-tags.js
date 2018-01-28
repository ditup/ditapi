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

    // handle errors
    switch (e.code) {
      // duplicate idea-tag
      case 409: {
        return res.status(409).end();
      }
      // missing idea or tag or creator
      case 404: {
        const errors = e.missing.map(miss => ({ status: 404, detail: `${miss} not found`}));
        return res.status(404).json({ errors });
      }
      // idea creator is not me
      case 403: {
        return res.status(403).json({ errors: [
          { status: 403, detail: 'not logged in as idea creator' }
        ]});
      }
      // unexpected error
      default: {
        return next(e);
      }
    }

  }
}

module.exports = { post };
