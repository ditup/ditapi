'use strict';

const path = require('path');

const models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

/**
 * Middleware to create a comment
 */
async function post(req, res, next) {
  try {
    // gather data
    const { id } = req.params;
    const creator = req.auth.username;
    const { content } = req.body;

    const primary = { type: 'ideas', id };
    // save the comment to database
    const newComment = await models.comment.create({ content, primary, creator });

    // when the primary document was not found, respond appropriately
    if (newComment === null) {
      return res.status(404).json({
        errors: [
          { status: 404, detail: 'primary document not found' }
        ]
      });
    }

    // serialize the comment (JSON API)
    const serializedComment = serialize.comment(newComment);

    // respond
    return res.status(201).json(serializedComment);

  } catch (e) {
    return next(e);
  }
}

/**
 * Middleware to read comments of a primary object (i.e. idea)
 */
async function get(req, res, next) {
  try {
    // gather data
    const { id } = req.params;
    const { page: { offset = 0, limit = 10 } = { }, sort = 'created' } = req.query;

    // primary object whose comments we want to read
    const primary = { type: 'ideas', id };
    // read the comments from database
    const comments = await models.comment.readCommentsOf(primary, { offset, limit, sort });

    // serialize the comments
    const serializedComments = serialize.comment(comments);

    // respond
    return res.status(200).json(serializedComments);
  } catch (e) {
    switch (e.code) {
      case 404: {
        return res.status(404).json({ errors: [{ status: 404, detail: 'primary object not found' }]});
      }
      default: {
        return next(e);
      }
    }
  }
}

module.exports = { get, post };
