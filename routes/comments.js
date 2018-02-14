'use strict';

const express = require('express'),
      path = require('path'),
      router = express.Router();

const authorize = require(path.resolve('./controllers/authorize')),
      commentControllers = require(path.resolve('./controllers/comments')),
      commentValidators = require(path.resolve('./controllers/validators/comments'));

router.route('/:id')
  // update a comment
  .patch(authorize.onlyLogged, commentValidators.patch, commentControllers.patch)
  // delete a comment
  .delete(authorize.onlyLogged, commentValidators.del, commentControllers.del);

module.exports = router;
