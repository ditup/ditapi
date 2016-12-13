'use strict';

let passport = require('passport'),
    _ = require('lodash'),
    path = require('path'),
    models = require(path.resolve('./models')),
    BasicStrategy = require('passport-http').BasicStrategy;

passport.use(new BasicStrategy(
  async function(username, password, done) {
    let auth = await models.user.authenticate(username, password);

    // full login
    let user = {
      logged: Boolean(auth.authenticated && auth.verified)
    }

    // partial login (unverified)
    if (auth.authenticated && ! auth.verified) 
      user.loggedUnverified = true;

    // additional information
    if (auth.authenticated) {
      _.assign(user, _.pick(auth, ['username', 'givenName', 'familyName']));
    }

    return done(null, user);
  }
));

module.exports = function (req, res, next) {
  passport.authenticate('basic', { session : false },
  function (err, user, info) {
    // add user info to body
    req.auth = user || { logged: false };
    next();
  })(req, res, next);
};
