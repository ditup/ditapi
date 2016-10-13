var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');

var users = require('./routes/users');

// middleware which will deserialize JSON API requests
var serializerMiddleware = require('./serializers').middleware;

var app = express();

app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(expressValidator());

// here we deserialize JSON API requests
app.use(serializerMiddleware);

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
if (app.get('env') === 'development') {
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
