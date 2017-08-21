'use strict';

const path = require('path'),
      config = require(path.resolve('./config/config')),
      serialize = require(path.resolve('./serializers')).serialize,
      models = require(path.resolve('./models')),
      _ = require('lodash'),
      { getPage } = require('./helpers');

/*
 * Having the url with ?filter[tagname][like]=string query
 * find the tags matching the provided string
 *
 */
exports.getTagsLike = async function (req, res, next) {
  // get the pattern to search the tags by
  const filterLike = _.get(req.query, 'filter.tagname.like');
  const { offset, limit } = getPage(req, { offset: 0, limit: 10 });

  try {
    const foundTags = await models.tag.filter(filterLike, { offset, limit });

    return res.status(200).json(serialize.tag(foundTags));
  } catch (e) {
    return next(e);
  }
};

/*
 * Having the url with ?filter[random] query
 * respond with an array of random tags. (by default 1 tag)
 */
exports.getRandomTags = async function (req, res, next) {

  const { limit } = getPage(req, { limit: 1 });

  try {
    // find random tags
    const foundTags = await models.tag.random(limit);

    // define the parameters for self link
    foundTags.urlParam = encodeURIComponent('filter[random]');

    // serialize and send the results
    return res.status(200).json(serialize.tag(foundTags));
  } catch (e) {
    return next(e);
  }
};


/*
 * Having the url with ?filter[relatedToMyTags] query
 * respond with an array of tags related to my tags.
 * "related" means: There exist users who have both my tag and the other tag
 * (sorted by geometric mean of the userTag relevances)
 */
exports.relatedToMyTags = async function (req, res, next) {
  // this is me
  const { username } = req.auth;
  const { offset, limit } = getPage(req, { offset: 0, limit: 10 });

  try {
    // find tags which are related to my tags
    const foundTags = await models.tag.findTagsRelatedToTagsOfUser(username, { offset, limit});

    // define the parameters for self link
    foundTags.urlParam = encodeURIComponent('filter[relatedToMyTags]');

    // serialize and send the results
    return res.status(200).json(serialize.tag(foundTags));
  } catch (e) {
    return next(e);
  }
};

/*
 * Having the url with ?filter[relatedToTags] query
 * respond with an array of tags related to given tags.
 * "related" means: There exist users who have both my tag and the other tag
 * (sorted by geometric mean of the userTag relevances)
 */
exports.relatedToTags = async function (req, res, next) {

  const tags = req.query.filter.relatedToTags;

  const { offset, limit } = getPage(req, { offset: 0, limit: 10 });

  try {
    // get tags from database
    const foundTags = await models.tag.findTagsRelatedToTags(tags, { offset, limit });

    // define the parameters for self link
    foundTags.urlParam = encodeURIComponent('filter[relatedToTags]');

    // serialize and send the results
    return res.status(200).json(serialize.tag(foundTags));
  } catch (e) {
    return next(e);
  }
};


// functions without goto redirection


/**
 * Create a new tag
 *
 */
// controller for POST /tags
exports.postTags = async function (req, res, next) {
  try {
    // read the tagname
    const tagname = req.body.tagname;

    // validating the new tag should be done outside before calling
    // this middleware

    // check that the tagname is unique
    const tagExists = await models.tag.exists(tagname);

    // error with 409 when the tagname already exists
    // TODO better error
    if (tagExists) {
      return res.status(409).json({
        errors: {
          meta: 'Tagname already exists'
        }
      });
    }


    const tagData = _.pick(req.body, ['tagname']);
    _.assign(tagData, { creator: req.auth.username });

    const tag = await models.tag.create(tagData);
    tag; // satisfy eslint & use this later

    // respond
    const selfLink = `${config.url.all}/tags/${tagname}`;
    return res.status(201)
      .set('Location', selfLink)
      .json(serialize.tag({
        id: req.body.tagname,
        tagname: req.body.tagname
      }));
  } catch (e) {
    return next(e);
  }
};

// controller for GET /tags/:tagname
exports.getTag = async function (req, res, next) {
  try {
    const tagname = req.params.tagname;

    const tag = await models.tag.read(tagname);

    // testing whether the tag was found, sending to 404
    // TODO not just next(), but some end?
    if (!tag) return next();


    _.assign(tag, { id: tagname });
    const selfLink = `${config.url.all}/tags/${tagname}`;

    return res.status(200)
      .set('Location', selfLink)
      .json(serialize.tag(tag));

  } catch (e) {
    return next(e);
  }
};
