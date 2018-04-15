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
    // save the dit to database
    const newDit = await models.dit.create(ditType, { title, detail, creator });

    // serialize the dit (JSON API)
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
 * Read dit by id
 */
async function get(req, res, next) {
  try {
    // gather data
    const { id } = req.params;
    const { username } = req.auth;
    const ditType = req.baseUrl.slice(1,-1);

    // read the dit from database
    const dit = await models.dit.read(ditType, id);

    if (!dit) return res.status(404).json({ });

    // see how many votes were given to dit and if/how logged user voted (0, -1, 1)
    dit.votes = await models.vote.readVotesTo({ type: ditType+'s', id });
    dit.myVote = await models.vote.read({ from: username, to: { type: ditType+'s', id } });

    // serialize the dit (JSON API)
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
 * Update dit's title or detail
 * PATCH /dits/:id
 */
async function patch(req, res, next) {
  let ditType;
  try {
    // gather data
    const { title, detail } = req.body;
    const { id } = req.params;
    ditType = req.baseUrl.slice(1,-1);
    const { username } = req.auth;

    // update dit in database
    const dit = await models.dit.update(ditType, id, { title, detail }, username);

    // serialize the dit (JSON API)
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
 * Get dits with my tags
 */
async function getDitsWithMyTags(req, res, next) {
  let ditType;
  try {
    // gather data
    const { username } = req.auth;
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    ditType = req.baseUrl.slice(1,-1);

    // read the dits from database
    const foundDits = await models.dit.withMyTags(ditType, username, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get dits with specified tags
 */
async function getDitsWithTags(req, res, next) {
  let ditType;
  try {

    // gather data
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    const { withTags: tagnames } = req.query.filter;
    ditType = req.baseUrl.slice(1,-1);


    // read the dits from database
    const foundDits = await models.dit.withTags(ditType, tagnames, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);
  } catch (e) {
    return next(e);
  }
}

/**
 * Get new dits
 */
async function getNewDits(req, res, next) {
  let ditType;
  try {
    const { page: { offset = 0, limit = 5 } = { } } = req.query;
    ditType = req.baseUrl.slice(1,-1);

    // read dits from database
    const foundDits = await models.dit.findNew(ditType, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);

  } catch (e) {
    return next(e);
  }
}

/**
 * Get random dits
 */
async function getRandomDits(req, res, next) {
  let ditType;
  try {
    const { page: { limit = 1 } = { } } = req.query;
    ditType = req.baseUrl.slice(1,-1);

    // read dits from database
    const foundDits = await models.dit.random(ditType, { limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);
  } catch (e) {
    return next(e);
  }
}

/**
 * Get dits with specified creators
 */
async function getDitsWithCreators(req, res, next) {
  let ditType;
  try {
    // gather data
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    const { creators } = req.query.filter;
    ditType = req.baseUrl.slice(1,-1);

    // read dits from database
    const foundDits = await models.dit.findWithCreators(ditType, creators, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);
  } catch (e) {
    return next(e);
  }
}

/**
 * Get dits commented by specified users
 */
async function getDitsCommentedBy(req, res, next) {
  let ditType;
  try {
    // gather data
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    const { commentedBy } = req.query.filter;
    ditType = req.baseUrl.slice(1,-1);

    // read dits from database
    const foundDits = await models.dit.findCommentedBy(ditType, commentedBy, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);
  } catch (e) {
    return next(e);
  }
}

/**
 * Get highly voted dits with an optional parameter of minimum votes
 */
async function getDitsHighlyVoted(req, res, next) {
  let ditType;
  try {
    // gather data
    const { page: { offset = 0, limit = 5 } = { } } = req.query;
    const { highlyVoted } = req.query.filter;
    ditType = req.baseUrl.slice(1,-1);

    // read dits from database
    const foundDits = await models.dit.findHighlyVoted(ditType, highlyVoted, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);
  } catch (e) {
    return next(e);
  }
}

/**
 * Get trending dits
 */
async function getDitsTrending(req, res, next) {
  let ditType;
  try {
    // gather data
    const { page: { offset = 0, limit = 5 } = { } } = req.query;
    ditType = req.baseUrl.slice(1,-1);

    // read dits from database
    const foundDits = await models.dit.findTrending(ditType, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);
  } catch (e) {
    return next(e);
  }
}

/**
 * Get dits with any of specified keywords in title
 */
async function getDitsSearchTitle(req, res, next) {
  let ditType;
  try {
    // gather data
    const { page: { offset = 0, limit = 10 } = { } } = req.query;
    const { like: keywords } = req.query.filter.title;
    ditType = req.baseUrl.slice(1,-1);

    // read ideas from database
    const foundDits = await models.dit.findWithTitleKeywords(ditType, keywords, { offset, limit });

    // serialize the dit (JSON API)
    let serializedDits;
    switch(ditType){
      case 'idea': {
        serializedDits = serialize.idea(foundDits);
        break;
      }
      case 'challenge': {
        serializedDits = serialize.challenge(foundDits);
        break;
      }
    }
    // respond
    return res.status(200).json(serializedDits);

  } catch (e) {
    return next(e);
  }
}

module.exports = { get, getDitsCommentedBy, getDitsHighlyVoted, getDitsSearchTitle, getDitsTrending, getDitsWithCreators, getDitsWithMyTags, getDitsWithTags, getNewDits, getRandomDits, patch, post };
