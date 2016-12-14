'use strict';

// load module dependencies
const express = require('express'),
    bodyParser = require('body-parser'),
    _ = require('lodash'),
    passport = require('passport'),
    helmet = require('helmet'),
    expressValidator = require('express-validator');

// load internal dependencies
let models = require('./models'),
    config = require('./config'),
    authenticate = require('./controllers/authenticate'),
    deserialize = require('./controllers/deserialize'),
    customValidators = require('./controllers/validators/custom');


// configure the database for all the models
models.connect(config.database);

var app = express();

app.set('env', process.env.NODE_ENV || 'development');

// Cross Origin Resource Sharing
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
  return next();
});

// Protect against some web vulnerabilities by setting some headers with Helmet
// https://expressjs.com/en/advanced/best-practice-security.html
app.use(helmet());

app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// here we deserialize JSON API requests
app.use(deserialize);

// authentication with passport
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

// actual routes
app.use('/users', require('./routes/users'));
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
