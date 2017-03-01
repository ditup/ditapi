'use strict';

const path = require('path'),
      crypto = require('crypto'),
      config = require(path.resolve('./config/config')),
      Identicon = require('identicon.js'),
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

    let auth = _.get(req, 'auth', { logged: false });

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

// edit a user with PATCH request
// presumption: data in body should already be valid and user should be logged in as herself
exports.patchUser = async function (req, res, next) {
  // check that user id in body equals username from url
  if (req.body.id !== req.params.username) {
    let e = new Error('username in url parameter and in body don\'t match');
    e.status = 400;
    return next(e);
  }

  // the list of allowed profile fields (subset of these needs to be provided)
  let profileFields = ['givenName', 'familyName', 'description'];

  // check that only profile fields are present in the request body
  let unwantedParams = _.difference(Object.keys(req.body), _.union(profileFields, ['id']));
  if (unwantedParams.length > 0) { // if any unwanted fields are present, error.
    let e = new Error('The request body contains unexpected attributes');
    e.status = 400;
    return next(e);
  }

  // pick only the profile fields from the body of the request
  let profile = _.pick(req.body, profileFields);

  // update the profile with the new values
  await models.user.update(req.params.username, profile);
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
};

exports.postUserTags = async function (req, res, next) {
  try {
    // should be already validated
    const username = req.params.username;
    const tagname = req.body.tagname;
    const story = req.body.story;
    const relevance = req.body.relevance;

    const exists = await models.userTag.exists(username, tagname);

    if(exists !== false) {
      let e = new Error('userTag already exists');
      e.status = 409;
      throw e;
    }

    let created = await models.userTag.create({ username, tagname, story, relevance });
    if (!created) {
      return next(); // forwarding to 404 error
    }

    _.assign(created, { id: `${created.user.username}--${created.tag.tagname}` });

    // respond
    var selfLink = `${config.url.all}/users/${username}/tags/${tagname}`;
    let resp = serialize.userTag(created);

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
    const { username, tagname } = req.params;

    const userTag = await models.userTag.read(username, tagname);

    // respond
    const serialized = serialize.userTag(userTag);

    return res.status(200)
      .json(serialized);
  } catch (e) {
    return next(e);
  }
};

exports.patchUserTag = async function (req, res, next) {

  const { username, tagname } = req.params;

  // TODO check that username--tagname matches params

  // the list of allowed user-tag fields (subset of these needs to be provided)
  let userTagFields = ['relevance', 'story'];

  // check that only user-tag fields are present in the request body
  let unwantedParams = _.difference(Object.keys(req.body), _.union(userTagFields, ['id']));
  if (unwantedParams.length > 0) { // if any unwanted fields are present, error.
    const e = new Error('The request body contains unexpected attributes');
    e.status = 400;
    return next(e);
  }

  // pick only the user-tag fields from the body of the request
  const userTagData = _.pick(req.body, userTagFields);

  // update the user-tag with the new values
  await models.userTag.update(username, tagname, userTagData);
  return next();
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

async function getAvatar(req, res, next) {
  const { username } = req.params;

  const usernameExists = await models.user.exists(username);

  if (usernameExists !== true) {
    return next();
  }

  return res.status(200).json({
    data: {
      type: 'user-avatars',
      id: username,
      attributes: {
        format: 'png',
        base64: identicon(username)
      }
    }
  });
}

function identicon(username) {
  const hash = crypto.createHash('sha256').update(username).digest('hex');

  const options = {
    size: 512,
    format: 'png'
  };

  // create a base64 encoded png
  return new Identicon(hash, options).toString();
}

exports.getAvatar = getAvatar;
