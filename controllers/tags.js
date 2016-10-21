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
