'use strict';

// load module dependencies
const express = require('express'),
      bodyParser = require('body-parser'),
      passport = require('passport'),
      cors = require('cors'),
      helmet = require('helmet');

// load internal dependencies
const models = require('./models'),
      config = require('./config'),
      authenticate = require('./controllers/authenticate'),
      deserialize = require('./controllers/deserialize'),
      sanitizer = require('./controllers/validators/sanitizer');


// configure the database for all the models
models.connect(config.database);

const app = express();

app.set('env', process.env.NODE_ENV || 'development');

// Cross Origin Resource Sharing
app.use(cors(config.cors));

// Protect against some web vulnerabilities by setting some headers with Helmet
// https://expressjs.com/en/advanced/best-practice-security.html
app.use(helmet());

app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// here we deserialize JSON API requests
app.use(deserialize);
// here we sanitize all string properties in request body
app.use(sanitizer);

// authentication with passport
app.use(passport.initialize());
app.use(authenticate);

// we set Content-Type header of all requests to JSON API
app.use(function (req, res, next) {
  res.contentType('application/vnd.api+json');
  return next();
});

// actual routes
app.use('/users', require('./routes/users'));
app.use('/tags', require('./routes/tags'));
app.use('/auth', require('./routes/auth'));
app.use('/messages', require('./routes/messages'));
app.use('/account', require('./routes/account'));
app.use('/contacts', require('./routes/contacts'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
/**
 * Validation Error Handler
 */
app.use(require('./controllers/validators/errorHandler'));

// development error handler
// will print stacktrace
if (app.get('env') === 'development' || app.get('env') === 'test') {
  app.use(function(err, req, res, next) { // eslint-disable-line no-unused-vars
    if (!err.status) {
      console.error(err); // eslint-disable-line no-console
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
app.use(function(err, req, res, next) { // eslint-disable-line no-unused-vars
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
