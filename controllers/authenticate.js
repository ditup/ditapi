'use strict';

let passport = require('passport'),
    co = require('co'),
    _ = require('lodash'),
    path = require('path'),
    models = require(path.resolve('./models')),
    BasicStrategy = require('passport-http').BasicStrategy;

passport.use(new BasicStrategy(
  function(username, password, done) {
    return co(function * () {
      let auth = yield models.user.authenticate(username, password);

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
    })
    .catch(done);
  }
));

module.exports = function (req, res, next) {
  passport.authenticate('basic', { session : false },
  function (err, user, info) {
    // add user info to body
    req.body.user = user || { logged: false };
    next();
  })(req, res, next);
};
