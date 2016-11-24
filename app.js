'use strict';

var express = require('express'),
    bodyParser = require('body-parser'),
    _ = require('lodash'),
    passport = require('passport'),
    expressValidator = require('express-validator');

var users = require('./routes/users'),
    models = require('./models'),
    config = require('./config'),
    authenticate = require('./controllers/authenticate'),
    customValidators = require('./controllers/validators/custom');

models.connect(config.database);

var app = express();

app.set('env', process.env.NODE_ENV || 'development');

app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// here we deserialize JSON API requests
app.post('*', function (req, res, next) {
  if (!req.body.data) {
    let e = new Error();
    e.status = 400;
    throw e;
  }
  return next();
}, require('./serializers').middleware);

// authentication
app.use(passport.initialize());
app.use(authenticate);

app.use(expressValidator({
  customValidators: customValidators
}));

// we set Content-Type header of all requests to JSON API
app.use(function (req, res, next) {
  res.contentType('application/vnd.api+json');
  return next();
});

// access control allow origin
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
  next();
});

// actual routers
app.use('/users', users);
app.use('/tags', require('./routes/tags'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development' || app.get('env') === 'test') {
  app.use(function(err, req, res, next) {
    if (!err.status) {
      console.error(err);
    }
    res.status(err.status || 500).json({
      errors: [
        {
          message: err.message,
          error: err
        }
      ]
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500)
    .json({
      errors: [
        {
          message: err.message,
          error: err
        }
      ]
    });
});


module.exports = app;
