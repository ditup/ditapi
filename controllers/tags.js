'use strict';

var path = require('path'),
    co = require('co'),
    config = require(path.resolve('./config/config')),
    serialize = require(path.resolve('./serializers')).serialize,
    models = require(path.resolve('./models')),
    _ = require('lodash'),
    mailer = require(path.resolve('./services/mailer'));

exports.postTags = function (req, res, next) {
  return co(function* () {
    let tagname = req.body.tagname;
    // validate tags is done outside
    // save tags
    let tagData = _.pick(req.body, ['tagname', 'description']);
    _.assign(tagData, { creator: req.body.user.username });

    let tag = yield models.tag.create(tagData);

    // respond
    var selfLink = `${config.url.all}/tags/${tagname}`;
    return res.status(201)
      .set('Location', selfLink)
      .json(serialize.tag({
        id: req.body.tagname,
        tagname: req.body.tagname
      }));
  })
  .catch(next);
};

// controller for GET /tags/:tagname
exports.getTag = function (req, res, next) {
  return co(function* () {
    let tagname = req.params.tagname;

    let tag = yield models.tag.read(tagname);

    // testing whether the tag was found, sending to 404
    // TODO not just next(), but some end?
    if (!tag) return next();


    _.assign(tag, { id: tagname });
    var selfLink = `${config.url.all}/tags/${tagname}`;
    
    return res.status(200)
      .set('Location', selfLink)
      .json(serialize.tag(tag));
  })
  .catch(next);
};
