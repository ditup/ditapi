'use strict';

const path = require('path');

const models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

/**
 * Controllers factory.
 *
 * Controllers need to know what is the primary object of comments/reactions.
 * For reactions it is 'comments'.
 * For comments it is 'ideas' etc.
 */
module.exports = function controllersFactory(primary) {

  const isReactions = primary === 'comment';
  const primarys = primary + 's';
  const comment = (isReactions) ? 'reaction' : 'comment';
  const comments = comment + 's';

  /**
   * Middleware to create a comment
   */
  async function post(req, res, next) {
    try {
      // gather data
      const { id } = req.params;
      const creator = req.auth.username;
      const { content } = req.body;

      const primary = { type: primarys, id };
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
      const serializedComment = serialize[comment](newComment);

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
      const { page: { offset, limit } = { }, sort = 'created' } = req.query;

      // primary object whose comments we want to read
      const primary = { type: primarys, id };
      // read the comments from database
      const comments = await models.comment.readCommentsOf(primary, { offset, limit, sort });

      // serialize the comments
      const serializedComments = serialize.comment(comments);

      // respond
      return res.status(200).json(serializedComments);
    } catch (e) {
      switch (e.code) {
        case 404: {
          return res.status(404).json({ errors: [{ status: 404, detail: `${primary} not found` }]});
        }
        default: {
          return next(e);
        }
      }
    }
  }

  /**
   * Edit comment
   */
  async function patch(req, res, next) {
    try {
      // gather data
      const { id } = req.params;
      const { content } = req.body;
      const { username } = req.auth;

      const updated = await models.comment.update(id, { content }, username, comments);

      // serialize the comment (JSON API)
      const serializedComment = serialize[comment](updated);


      return res.status(200).json(serializedComment);
    } catch (e) {

      switch (e.code) {
        case 404: {
          return res.status(404).json({
            errors: [{ status: 404, detail: e.message }]
          });
        }
        case 403: {
          return res.status(403).json({
            errors: [{ status: 403, detail: e.message }]
          });
        }
        default: {
          return next(e);
        }
      }
    }
  }

  /**
   * Remove comment
   */
  async function del(req, res, next) {
    try {
      // gather data
      const { id } = req.params;
      const { username } = req.auth;

      await models.comment.remove(id, username, comments);

      return res.status(204).end();
    } catch (e) {
      switch (e.code) {
        case 404: {
          return res.status(404).json({
            errors: [{ status: 404, detail: e.message }]
          });
        }
        case 403: {
          return res.status(403).json({
            errors: [{ status: 403, detail: e.message }]
          });
        }
        default: {
          return next(e);
        }
      }
    }
  }

  return { del, get, patch, post };
};
