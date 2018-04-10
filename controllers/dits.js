'use strict';

const path = require('path'),
      models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize;

/**
 * Create dit
 */
async function post(req, res, next) {
  try {
    // gather data
    const { title, detail, ditType } = req.body;
    const creator = req.auth.username;
    // save the idea to database
    const newDit = await models.dit.create(ditType, { title, detail, creator });

    // serialize the idea (JSON API)
    let serializedDit;
    switch(ditType){
      case 'idea': {
        serializedDit = serialize.idea(newDit);
        break;
      }
      case 'challenge': {
        serializedDit = serialize.challenge(newDit);
        break;
      }
    }
    // respond
    return res.status(201).json(serializedDit);

  } catch (e) {
    return next(e);
  }
}

/**
 * Read idea by id
 */
async function get(req, res, next) {
  try {
    // gather data
    const { id } = req.params;
    const { username } = req.auth;
    const ditType = req.baseUrl.slice(1,-1);

    // read the idea from database
    const dit = await models.dit.read(ditType, id);

    if (!dit) return res.status(404).json({ });

    // see how many votes were given to dit and if/how logged user voted (0, -1, 1)
    dit.votes = await models.vote.readVotesTo({ type: ditType+'s', id });
    dit.myVote = await models.vote.read({ from: username, to: { type: ditType+'s', id } });

    // serialize the idea (JSON API)
    let serializedDit;
    switch(ditType){
      case 'idea': {
        serializedDit = serialize.idea(dit);
        break;
      }
      case 'challenge': {
        serializedDit = serialize.challenge(dit);
        break;
      }
    }

    // respond
    return res.status(200).json(serializedDit);

  } catch (e) {
    return next(e);
  }
}

/**
 * Update idea's title or detail
 * PATCH /ideas/:id
 */
async function patch(req, res, next) {
  let ditType;
  try {
    // gather data
    const { title, detail } = req.body;
    const { id } = req.params;
    ditType = req.baseUrl.slice(1,-1);
    const { username } = req.auth;

    // update idea in database
    const dit = await models.dit.update(ditType, id, { title, detail }, username);

    // serialize the idea (JSON API)
    let serializedDit;
    switch(ditType){
      case 'idea': {
        serializedDit = serialize.idea(dit);
        break;
      }
      case 'challenge': {
        serializedDit = serialize.challenge(dit);
        break;
      }
    }

    // respond
    return res.status(200).json(serializedDit);
  } catch (e) {
    // handle errors
    switch (e.code) {
      case 403: {
        return res.status(403).json({
          errors: [{ status: 403, detail: 'only creator can update' }]
        });
      }
      case 404: {
        return res.status(404).json({
          errors: [{ status: 404, detail: `${ditType} not found` }]
        });
      }
      default: {
        return next(e);
      }
    }
  }
}

/**
 * Get ideas with my tags
 */
async function getDitsWithMyTags(req, res, next) {
  try {
    // gather data
    const { username } = req.auth;
    const { page: { offset = 0, limit = 10 } = { } } = req.query;

    // read the ideas from database
    const foundIdeas = await models.idea.withMyTags(username, { offset, limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get ideas with specified tags
 */
async function getDitsWithTags(req, res, next) {
  try {

    // gather data
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    const { withTags: tagnames } = req.query.filter;

    // read the ideas from database
    const foundIdeas = await models.idea.withTags(tagnames, { offset, limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get new ideas
 */
async function getNewDits(req, res, next) {
  try {
    const { page: { offset = 0, limit = 5 } = { } } = req.query;

    // read ideas from database
    const foundIdeas = await models.idea.findNew({ offset, limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get random ideas
 */
async function getRandomDits(req, res, next) {
  try {
    const { page: { limit = 1 } = { } } = req.query;

    // read ideas from database
    const foundIdeas = await models.idea.random({ limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get ideas with specified creators
 */
async function getDitsWithCreators(req, res, next) {
  try {
    // gather data
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    const { creators } = req.query.filter;

    // read ideas from database
    const foundIdeas = await models.idea.findWithCreators(creators, { offset, limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get ideas commented by specified users
 */
async function getDitsCommentedBy(req, res, next) {
  try {
    // gather data
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    const { commentedBy } = req.query.filter;

    // read ideas from database
    const foundIdeas = await models.idea.findCommentedBy(commentedBy, { offset, limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get highly voted ideas with an optional parameter of minimum votes
 */
async function getDitsHighlyVoted(req, res, next) {
  try {
    // gather data
    const { page: { offset = 0, limit = 5 } = { } } = req.query;
    const { highlyVoted } = req.query.filter;

    // read ideas from database
    const foundIdeas = await models.idea.findHighlyVoted(highlyVoted, { offset, limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get trending ideas
 */
async function getDitsTrending(req, res, next) {
  try {
    // gather data
    const { page: { offset = 0, limit = 5 } = { } } = req.query;

    // read ideas from database
    const foundIdeas = await models.idea.findTrending({ offset, limit });

    // serialize
    const serializedIdeas = serialize.idea(foundIdeas);

    // respond
    return res.status(200).json(serializedIdeas);

  } catch (e) {
    return next(e);
  }
}

module.exports = { get, getDitsCommentedBy, getDitsHighlyVoted, getDitsTrending, getDitsWithCreators, getDitsWithMyTags, getDitsWithTags, getNewDits, getRandomDits, patch, post };
