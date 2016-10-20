var express = require('express'),
    bodyParser = require('body-parser'),
    passport = require('passport'),
    expressValidator = require('express-validator');

var users = require('./routes/users'),
    models = require('./models'),
    config = require('./config'),
    authenticate = require('./controllers/authenticate'),
    customValidators = require('./controllers/validators/custom');

models.connect(config.database);

// middleware which will deserialize JSON API requests
var deserializeMiddleware = require('./serializers').middleware;

var app = express();

app.set('env', process.env.NODE_ENV || 'development');

app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// authentication
app.use(passport.initialize());
app.use(authenticate);

app.use(expressValidator({
  customValidators: customValidators
}));

// here we deserialize JSON API requests
app.post('*', deserializeMiddleware);

// we set Content-Type header of all requests to JSON API
app.use(function (req, res, next) {
  res.contentType('application/vnd.api+json');
  return next();
});

// users router
app.use('/users', users);

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
    console.error(err);
    res.status(err.status || 500).json({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500)
    .json({
      message: err.message,
      error: {}
    });
});


module.exports = app;
