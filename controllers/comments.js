'use strict';

const path = require('path');

const models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

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

module.exports = { post };
