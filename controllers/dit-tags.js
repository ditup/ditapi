'use strict';

const path = require('path');

const models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

/**
 * Controller for POST /dits/:id/tags
 * Adds a tag to a dit
 */
async function post(req, res, next) {
  let ditType;
  try {
    // gather data from request
    const { tagname } = req.body.tag;
    const ditId = req.params.id;
    const username = req.auth.username;

    ditType = req.baseUrl.slice(1,-1);
    // save new dit-tag to database
    const newDitTag = await models.ditTag.create(ditType, ditId, tagname, { }, username);
    // serialize response body
    let responseBody;
    switch(ditType){
      case 'idea': {
        responseBody = serialize.ideaTag(newDitTag);
        break;
      }
      case 'challenge': {
        responseBody = serialize.challengeTag(newDitTag);
        break;
      }
    }

    // respond
    return res.status(201).json(responseBody);
  } catch (e) {
    // handle errors
    switch (e.code) {
      // duplicate dit-tag
      case 409: {
        return res.status(409).end();
      }
      // missing dit or tag or creator
      case 404: {
        const errors = e.missing.map(miss => ({ status: 404, detail: `${miss} not found`}));
        return res.status(404).json({ errors });
      }
      // dit creator is not me
      case 403: {
        return res.status(403).json({ errors: [
          { status: 403, detail: `not logged in as ${ditType} creator` }
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
 * Read list of tags of dit
 * GET /dits/:id/tags
 */
async function get(req, res, next) {
  let ditType;
  try {
    // read dit id
    const { id } = req.params;
    ditType = req.baseUrl.slice(1, -1);

    // read ditTags from database
    const newDitTags = await models.ditTag.readTagsOfDit(ditType, id);

    // serialize response body
    let responseBody;
    switch(ditType){
      case 'idea': {
        responseBody = serialize.ideaTag(newDitTags);
        break;
      }
      case 'challenge': {
        responseBody = serialize.challengeTag(newDitTags);
        break;
      }
    }

    // respond
    return res.status(200).json(responseBody);
  } catch (e) {
    // error when idea doesn't exist
    if (e.code === 404) {
      return res.status(404).json({ errors: [{
        status: 404,
        detail: `${ditType} not found`
      }] });
    }

    // handle unexpected error
    return next(e);
  }
}

/**
 * Remove tag from idea
 * DELETE /dits/:id/tags/:tagname
 */
async function del(req, res, next) {
  let ditType;
  try {
    const { id, tagname } = req.params;
    const { username } = req.auth;
    ditType = req.baseUrl.slice(1, -1);

    await models.ditTag.remove(ditType, id, tagname, username);

    return res.status(204).end();
  } catch (e) {
    switch (e.code) {
      case 404: {
        return res.status(404).end();
      }
      case 403: {
        return res.status(403).json({ errors: [
          { status: 403, detail: `not logged in as ${ditType} creator` }
        ] });
      }
      default: {
        return next(e);
      }
    }
  }
}

module.exports = { post, get, del };