'use strict';

var path = require('path'),
    config = require(path.resolve('./config/config')),
    serialize = require(path.resolve('./serializers')).serialize,
    models = require(path.resolve('./models')),
    _ = require('lodash'),
    mailer = require(path.resolve('./services/mailer'));

exports.postUsers = async function (req, res, next) {
  try {
    let { username, email } = req.body;

    // check the uniqueness of username and email (among verified email addresses)
    let usernameExists = await models.user.exists(username);

    let emailExists = await models.user.emailExists(email);

    if (usernameExists || emailExists) {
      return res.status(409).json({ errors: { meta: '' } });
    }

    // validating the data should be already done
    // save users
    let user = await models.user.create({
      username: req.body.username,
      password: req.body.password,
      email: req.body.email
    });

    // send a link for email verification to the provided email address
    await mailer.verifyEmail({
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
    
  } catch (e) {
    return next(e);
  }
};

exports.getUser = async function (req, res, next) {
  try {
    
    let auth = _.get(req, 'body.user', { logged: false });

    let username = req.params.username;
    let user = await models.user.read(username);

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
  } catch (e) {
    return next(e);
  }
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
    e.status = 400;
    return next(e);
  }
}

exports.postUserTags = async function (req, res, next) {
  try {
    // should be already validated
    let username = req.params.username;
    let tagname = req.body.tagname;
    let story = req.body.story;

    let exists = await models.userTag.exists(username, tagname);

    if(exists !== false) {
      let e = new Error('userTag already exists');
      e.status = 409;
      throw e;
    }

    let created = await models.userTag.create({ username, tagname, story });
    if (!created) {
      return next(); // forwarding to 404 error
    }

    _.assign(created, { id: created.tag.tagname });

    // respond
    var selfLink = `${config.url.all}/users/${username}/tags/${tagname}`;
    let resp = serialize.userTag(created);
    let meta = _.pick(created, ['created', 'story']);
    _.assign(resp, { meta });


    return res.status(201)
      .set('Location', selfLink)
      .json(resp);
    
  } catch (e) {
    return next(e);
  }
};

exports.getUserTags = async function (req, res, next) {
  try {
    // should be already validated
    let username = req.params.username;

    let userTags = await models.user.readTags(username);

    _.forEach(userTags, function (userTag) {
      _.assign(userTag, { id: userTag.tag.tagname });
    });

    let serialized = serialize.userTags({ username, userTags });

    return res.status(200)
      .json(serialized);
    
  } catch (e) {
    return next(e);
  }
};

exports.getUserTag = async function (req, res, next) {
  try {
    // should be already validated
    let { username, tagname } = req.params;

    let userTag = await models.userTag.read(username, tagname);

    _.assign(userTag, { id: userTag.tag.tagname });

    // respond
    var selfLink = `${config.url.all}/users/${username}/tags/${tagname}`;
    let serialized = serialize.userTag(userTag);

    return res.status(200)
      .json(serialized);
  } catch (e) {
    return next(e);
  }
};

exports.deleteUserTag = async function (req, res, next) {
  try {
    // should be already validated
    // and checked rights
    let { username, tagname } = req.params;

    let isSuccess = await models.userTag.delete(username, tagname);

    if (isSuccess !== true) return next(); // sending to 404

    return res.status(204).end();
  } catch (e) {
    return next(e);
  }
};
