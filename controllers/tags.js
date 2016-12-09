'use strict';

var path = require('path'),
    config = require(path.resolve('./config/config')),
    serialize = require(path.resolve('./serializers')).serialize,
    models = require(path.resolve('./models')),
    _ = require('lodash'),
    mailer = require(path.resolve('./services/mailer'));

/**
 * Create a new tag
 *
 */
exports.postTags = async function (req, res, next) {
  try {
    // read the tagname
    let tagname = req.body.tagname;

    // validating the new tag should be done outside before calling
    // this middleware

    // check that the tagname is unique
    let tagExists = await models.tag.exists(tagname);

    // error with 409 when the tagname already exists
    // TODO better error
    if (tagExists) {
      return res.status(409).json({
        errors: {
          meta: 'Tagname already exists'
        }
      });
    }

    
    let tagData = _.pick(req.body, ['tagname', 'description']);
    _.assign(tagData, { creator: req.body.user.username });

    let tag = await models.tag.create(tagData);

    // respond
    var selfLink = `${config.url.all}/tags/${tagname}`;
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
    let tagname = req.params.tagname;

    let tag = await models.tag.read(tagname);

    // testing whether the tag was found, sending to 404
    // TODO not just next(), but some end?
    if (!tag) return next();


    _.assign(tag, { id: tagname });
    var selfLink = `${config.url.all}/tags/${tagname}`;
    
    return res.status(200)
      .set('Location', selfLink)
      .json(serialize.tag(tag));
    
  } catch (e) {
    return next(e);
  }
};
