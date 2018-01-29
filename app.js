'use strict';

// load module dependencies
const express = require('express'),
      bodyParser = require('body-parser'),
      cors = require('cors'),
      allowMethods = require('allow-methods'),
      helmet = require('helmet');

// load internal dependencies
const models = require('./models'),
      config = require('./config'),
      { validateContentType, validateAccept } = require('./controllers/security'),
      authenticate = require('./controllers/authenticate'),
      deserialize = require('./controllers/deserialize'),
      sanitizer = require('./controllers/validators/sanitizer');

// configure the database for all the models
models.connect(config.database);

const app = express();

app.set('env', process.env.NODE_ENV || 'development');

// Protect against some web vulnerabilities by setting some headers with Helmet
// https://expressjs.com/en/advanced/best-practice-security.html
app.use(helmet({
  frameguard: {
    action: 'deny'
  }
}));

// Cross Origin Resource Sharing
app.use(cors(config.cors));

// set Content-Type header for all responses to JSON API type
app.use(function (req, res, next) {
  res.contentType('application/vnd.api+json');
  return next();
});

// whitelist allowed methods
app.use(allowMethods(config.cors.methods));
// validate content-type header
app.use(validateContentType);
// validate accept (content-types) header
app.use(validateAccept);

app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// we set Content-Type header of all requests to JSON API
app.use(function (req, res, next) {
  res.contentType('application/vnd.api+json');
  return next();
});

// here we deserialize JSON API requests
app.use(deserialize);
// here we sanitize all string properties in request body
app.use(sanitizer);

// authentication
// set req.auth object with info about user rights
app.use(authenticate);

// actual routes
app.use('/users', require('./routes/users'));
app.use('/tags', require('./routes/tags'));
app.use('/auth', require('./routes/auth'));
app.use('/messages', require('./routes/messages'));
app.use('/account', require('./routes/account'));
app.use('/contacts', require('./routes/contacts'));
app.use('/ideas', require('./routes/ideas'));

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
app.use(require('./controllers/validators/error-handler'));

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
