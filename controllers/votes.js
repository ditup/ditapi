const path = require('path'),
      models = require(path.resolve('./models')),
      serializers = require(path.resolve('./serializers'));

/**
 * Middleware to POST a vote to idea (and other objects in the future)
 */
async function post(req, res, next) {

  // read data from request
  const { id } = req.params;
  const { value } = req.body;
  const { username } = req.auth;

  try {
    // save the vote to database
    const vote = await models.vote.create({ from: username, to: { type: 'ideas', id }, value });
    // respond
    const serializedVote = serializers.serialize.vote(vote);
    return res.status(201).json(serializedVote);
  } catch (e) {
    // handle errors
    switch (e.code) {
      // duplicate vote
      case 409: {
        return res.status(409).end();
      }
      // missing idea
      case 404: {
        return res.status(404).end();
      }
      default: {
        return next(e);
      }
    }
  }
}

module.exports = { post };
