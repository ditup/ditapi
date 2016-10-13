var express = require('express');
var router = express.Router();
var passport = require('passport');
var OAuth2Strategy = require('passport-oauth2');

passport.use(new OAuth2Strategy(
  {
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    clientID: '4a553962719e75a0b4b9',
    clientSecret: '8be94d446a0cac4b827eb424677b62f94b7ec099',
    callbackURL: "http://localhost:3000/login"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(accessToken, refreshToken, profile);
    // User.findOrCreate({ exampleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
    cb(null, true);
  }
));

// testing authorization

router.get('/login', passport.authenticate('oauth2'));

router.get('/', function(req, res, next) {
  res.json({ title: 'Express' });
});

module.exports = router;
