'use strict';

const _ = require('lodash'),
      path = require('path');

const config = require(path.resolve('./config/config')),
      mailer = require(path.resolve('./services/mailer')),
      models = require(path.resolve('./models')),
      serialize = require(path.resolve('./serializers')).serialize,
      { getPage } = require('./helpers');

/**
 * controller functions for user requests
 */

exports.getNewUsers = async function(req, res, next) {

  const { limit } = req.query.page;

  try {

    // get users from database
    const users = await models.user.findNewUsers(limit);

    // serialize and send the results
    return res.status(200).json(serialize.user(users));

  } catch (e) {
    // unhandled exceptions
    return next(e);
  }
};

exports.getUsersWithLocation = async function (req, res, next) {
  try {
    const [loc1, loc2] = req.query.filter.location;

    const users = await models.user.readUsersWithinRectangle(loc1, loc2);

    const serializedUsers = serialize.user(users);

    res.status(200).json(serializedUsers);
  } catch (e) {
    // unhandled exceptions
    return next(e);
  }
};

exports.getNewUsersWithMyTags = async function (req, res, next) {
  const { auth: { username: me } } = req;

  // parameters from query
  const limit = req.query.page.limit;
  const numberOfTagsInCommon = req.query.filter.withMyTags;

  try {
    // get users from database
    const users = await models.user.findNewUsersWithMyTags(me, limit, numberOfTagsInCommon);

    // serialize and send the results
    const serializedUsers = serialize.usersWithTags(users);

    return res.status(200).json(serializedUsers);
  } catch(e) {
    // unhandled exceptions
    return next(e);
  }
};

/**
 * Search users who are related to me by tags
 *
 *
 */
exports.getUsersWithMyTags = async function (req, res, next) {
  try {
    const { auth: { username: me } } = req;


    const { offset, limit } = getPage(req, { offset: 0, limit: 10 });

    const users = await models.user.readUsersByMyTags(me, { offset, limit });

    // remap users to a proper format for serializing
    const remappedUsers = _.map(users, function (ubt) {
      // user
      const user = {
        id: ubt.user.username,
        username: ubt.user.username
      };
      _.assign(user, _.pick(ubt.user.profile, ['givenName', 'familyName', 'description']));
      // user-tags
      user.userTags = _.map(ubt.userTags, function (userTag, i) {
        // tag relationship of user-tags
        userTag.tag = ubt.tags[i];
        return userTag;
      });
      return user;
    });

    const serializedUsers = serialize.usersByMyTags(remappedUsers);

    return res.status(200).json(serializedUsers);
  } catch (e) {
    // unhandled exceptions
    return next(e);
  }
};

exports.getUsersWithTags = async function (req, res, next) {
  try {
  // get array of tagnames from query (?filter[tag]=tag1,tag2)
    const tags = req.query.filter.tag;

    const { offset, limit } = getPage(req, { offset: 0, limit: 10 });

    // read users from database
    let usersByTags = await models.user.readUsersByTags(tags, { offset, limit });

    // remap users to a proper format for serializing
    usersByTags = _.map(usersByTags, function (ubt) {
      // user
      const user = {
        id: ubt.user.username,
        username: ubt.user.username
      };
      _.assign(user, _.pick(ubt.user.profile, ['givenName', 'familyName', 'description']));
      // user-tags
      user.userTags = _.map(ubt.userTags, function (userTag, i) {
        // tag relationship of user-tags
        userTag.tag = ubt.tags[i];
        return userTag;
      });
      return user;
    });

    // serialize users
    const serializedUsers = serialize.usersByTags(usersByTags);

    // respond
    return res.status(200).json(serializedUsers);

  } catch (e) {
    // unhandled exceptions
    return next(e);
  }
};

// Functions without goto redirection

exports.postUsers = async function (req, res, next) {
  try {
    const { username, email, password } = req.body;

    // check the uniqueness of username and email (among verified email addresses)
    const usernameExists = await models.user.exists(username);

    const emailExists = await models.user.emailExists(email);

    if (usernameExists || emailExists) {
      return res.status(409).json({ errors: { meta: '' } });
    }

    // validating the data should be already done
    // save users
    const user = await models.user.create({ username, password, email });

    // send a link for email verification to the provided email address
    await mailer.verifyEmail({
      username,
      url: `${config.appUrl.all}${config.appUrl.verifyEmail(username, user.emailVerifyCode)}`,
      email,
      code: user.emailVerifyCode
    });

    // respond
    const selfLink = `${config.url.all}/users/${username}`;
    return res.status(201)
      .set('Location', selfLink)
      .json(serialize.user({
        id: username,
        username
      }));

  } catch (e) {
    return next(e);
  }
};

exports.getUsers = async function (req, res, next) {
  try {
    /*
     * When query filter[tag]='tag1','tag0'
     * get users who have the provided tags
     */
    if (_.has(req, 'query.filter.tag')) {

      // get array of tagnames from query (?filter[tag]=tag1,tag2)
      const tags = req.query.filter.tag;

      // read users from database
      let usersByTags = await models.user.readUsersByTags(tags);

      // remap users to a proper format for serializing
      usersByTags = _.map(usersByTags, function(ubt) {
        // user
        const user = {
          id: ubt.user.username,
          username: ubt.user.username
        };
        _.assign(user, _.pick(ubt.user.profile, ['givenName', 'familyName', 'description']));
        // user-tags
        user.userTags = _.map(ubt.userTags, function (userTag, i) {
          // tag relationship of user-tags
          userTag.tag = ubt.tags[i];
          return userTag;
        });
        return user;
      });

      // serialize users
      const serializedUsers = serialize.usersByTags(usersByTags);

      // respond
      return res.status(200).json(serializedUsers);

    }
  } catch (e) {
    // unhandled exceptions
    return next(e);
  }
};

exports.getUser = async function (req, res, next) {
  try {

    const auth = _.get(req, 'auth', { logged: false });

    const { username } = req.params;
    const user = await models.user.read(username);

    if (user) {
      // picking values to output from user and user.profile
      const filteredUser = _.pick(user, ['username', 'location', 'locationUpdated']);

      // profile detail is for logged users only (or from loggedUnverified self)
      const isLogged = auth.logged === true;
      const isSelf = auth.username === username;

      const isLoggedUnverifiedSelf = !auth.logged &&
        auth.loggedUnverified === true && isSelf;

      if (isLogged || isLoggedUnverifiedSelf) {
        _.assign(filteredUser, _.pick(user.profile, ['givenName', 'familyName', 'description']));
      }

      // show email in self profile
      if (isSelf) {
        filteredUser.email = user.email;
        filteredUser.preciseLocation = user.preciseLocation;
      }

      filteredUser.id = filteredUser.username;

      const serializedUser = serialize.user(filteredUser);

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

  // user to patch
  const { username } = req.params;

  const profileFields = ['givenName', 'familyName', 'description'];

  // pick only the profile fields from the body of the request
  const profile = _.pick(req.body, profileFields);

  // update the location if provided
  if (req.body.hasOwnProperty('location')) {
    await models.user.updateLocation(username, req.body.location);
  }

  // update the profile with the new values
  await models.user.update(username, profile);
  return next();
};

exports.postUserTags = async function (req, res, next) {
  try {
    // should be already validated
    const { username } = req.params;
    const { story, relevance, tag: { tagname } } = req.body;

    const exists = await models.userTag.exists(username, tagname);

    if(exists !== false) {
      const e = new Error('userTag already exists');
      e.status = 409;
      throw e;
    }

    const created = await models.userTag.create({ username, tagname, story, relevance });
    if (!created) {
      return next(); // forwarding to 404 error
    }

    _.assign(created, { id: `${created.user.username}--${created.tag.tagname}` });

    // respond
    const selfLink = `${config.url.all}/users/${username}/tags/${tagname}`;
    const resp = serialize.userTag(created);

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
    const { username } = req.params;

    const userTags = await models.user.readTags(username);

    const serialized = serialize.userTags({ username, userTags });

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

  // the list of allowed user-tag fields (subset of these needs to be provided)
  const userTagFields = ['relevance', 'story'];

  // pick only the user-tag fields from the body of the request
  const userTagData = _.pick(req.body, userTagFields);

  // update the user-tag with the new values
  try {
    await models.userTag.update(username, tagname, userTagData);
  } catch (e) {
    if (e.status === 404) {
      res.status(404);
    }
    return next(e);
  }

  return next();
};

exports.deleteUserTag = async function (req, res, next) {
  try {
    // should be already validated
    // and checked rights
    const { username, tagname } = req.params;

    const isSuccess = await models.userTag.delete(username, tagname);

    if (isSuccess !== true) return next(); // sending to 404

    return res.status(204).end();
  } catch (e) {
    return next(e);
  }
};
