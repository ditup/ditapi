'use strict';

var path = require('path'),
    co = require('co'),
    config = require(path.resolve('./config/config')),
    serialize = require(path.resolve('./serializers')).serialize,
    models = require(path.resolve('./models')),
    _ = require('lodash'),
    mailer = require(path.resolve('./services/mailer'));

exports.postUsers = function (req, res, next) {
  return co(function * () {
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
  return co(function * () {
    let auth = _.get(req, 'body.user', { logged: false });

    let username = req.params.username;
    let user = yield models.user.read(username);

    if (user) {
      // picking values to output from user and user.profile
      let filteredUser = _.pick(user, ['username']);

      // profile detail is for logged users only (or from loggedUnverified self)
      let isLogged = auth.logged === true;
      let isLoggedUnverifiedSelf = !auth.logged &&
        auth.loggedUnverified === true && auth.username === username;

      if (isLogged || isLoggedUnverifiedSelf) {
        _.assign(filteredUser, _.pick(user.profile, ['givenName', 'familyName']));
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

exports.verifyEmail = function (req, res, next) {
  return co(function * () {
    let username = req.params.username;
    let code = req.params.code;

    yield models.user.verifyEmail(username, code);

    return res.status(200).json({});
  })
  .catch(next);
}
