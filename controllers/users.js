'use strict';

var path = require('path'),
    co = require('co'),
    config = require(path.resolve('./config/config')),
    serialize = require(path.resolve('./serializers')).serialize,
    models = require(path.resolve('./models')),
    _ = require('lodash'),
    mailer = require(path.resolve('./services/mailer'));

exports.postUsers = function (req, res, next) {
  return co(function* () {
    let username = req.body.username;
    // validate users is done outside
    // save users
    let user = yield models.user.create({
      username: req.body.username,
      password: req.body.password,
      email: req.body.email
    });

    yield mailer.verifyEmail({
      username: username,
      url: `${config.url.all}/users/${username}/account/email/verify/${user.emailVerifyCode}`,
      email: req.body.email
    });


    // respond
    var selfLink = `${config.url.all}/users/${username}`;
    return res.status(201)
      .set('Location', selfLink)
      .json(serialize.user({
        id: req.body.username,
        username: req.body.username
      }));
  })
  .catch(next);
};

exports.getUser = function (req, res, next) {
  return co(function* () {
    let auth = _.get(req, 'body.user', { logged: false });

    let username = req.params.username;
    let user = yield models.user.read(username);

    if (user) {
      // picking values to output from user and user.profile
      let filteredUser = _.pick(user, ['username']);

      // profile detail is for logged users only (or from loggedUnverified self)
      let isLogged = auth.logged === true;
      let isSelf = auth.username === username;

      let isLoggedUnverifiedSelf = !auth.logged &&
        auth.loggedUnverified === true && isSelf;

      if (isLogged || isLoggedUnverifiedSelf) {
        _.assign(filteredUser, _.pick(user.profile, ['givenName', 'familyName', 'description']));
      }

      // show email in self profile
      if (isSelf) {
        filteredUser.email = user.email;
      }

      filteredUser.id = filteredUser.username;

      let serializedUser = serialize.user(filteredUser);

      return res.status(200).json(serializedUser);
    } else {
      return next();
    }
  })
  .catch(next);
};

exports.patchUser = async function (req, res, next) {
  let receivedUser = req.body.user;
  receivedUser.id = req.params.username;
  let savedUser = await models.user.update(req.params.username, { givenName: req.body.givenName });
  return next();
};

exports.verifyEmail = async function (req, res, next) {
  try {
    let username = req.params.username;
    let code = req.params.code;

    await models.user.verifyEmail(username, code);

    return res.status(200).json({});
    
  } catch (e) {
    return next(e);
  }
}

exports.postUserTags = function (req, res, next) {
  return co(function* () {
    // should be already validated
    let username = req.params.username;
    let tagname = req.body.tagname;
    let story = req.body.story;

    let exists = yield models.userTag.exists(username, tagname);

    if(exists !== false) {
      let e = new Error('userTag already exists');
      e.status = 409;
      throw e;
    }

    let created = yield models.userTag.create({ username, tagname, story });
    if (!created) {
      return next(); // forwarding to 404 error
    }

    _.assign(created, { id: created.tag.tagname });

    // respond
    var selfLink = `${config.url.all}/users/${username}/tags/${tagname}`;
    let resp = serialize.userTag(created);
    let meta = _.pick(created, ['created', 'story']);
    _.assign(resp, { meta: meta });


    return res.status(201)
      .set('Location', selfLink)
      .json(resp);
  })
  .catch(next);
};

exports.getUserTags = function (req, res, next) {
  return co(function* () {
    // should be already validated
    let username = req.params.username;

    let userTags = yield models.user.readTags(username);

    _.forEach(userTags, function (userTag) {
      _.assign(userTag, { id: userTag.tag.tagname });
    });

    let serialized = serialize.userTags({ username, userTags });

    return res.status(200)
      .json(serialized);
  })
  .catch(next);
};

exports.getUserTag = function (req, res, next) {
  return co(function* () {
    // should be already validated
    let { username, tagname } = req.params;

    let userTag = yield models.userTag.read(username, tagname);

    _.assign(userTag, { id: userTag.tag.tagname });

    // respond
    var selfLink = `${config.url.all}/users/${username}/tags/${tagname}`;
    let serialized = serialize.userTag(userTag);

    return res.status(200)
      .json(serialized);
  })
  .catch(next);
};

exports.deleteUserTag = function (req, res, next) {
  return co(function* () {
    // should be already validated
    // and checked rights
    let { username, tagname } = req.params;

    let isSuccess = yield models.userTag.delete(username, tagname);

    if (isSuccess !== true) return next(); // sending to 404

    return res.status(204).end();
  })
  .catch(next);
};
