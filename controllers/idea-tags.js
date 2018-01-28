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

/**
 * Read list of tags of idea
 * GET /ideas/:id/tags
 */
async function get(req, res, next) {
  try {
    // read idea id
    const { id } = req.params;

    // read ideaTags from database
    const ideaTags = await models.ideaTag.readTagsOfIdea(id);

    // serialize response body
    const responseBody = serialize.ideaTag(ideaTags);

    // respond
    return res.status(200).json(responseBody);
  } catch (e) {
    // error when idea doesn't exist
    if (e.code === 404) {
      return res.status(404).json({ errors: [{
        status: 404,
        detail: 'idea not found'
      }] });
    }

    // handle unexpected error
    return next(e);
  }
}

module.exports = { post, get };
