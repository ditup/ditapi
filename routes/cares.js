'use strict';

const express = require('express'),
      path = require('path');

const authorize = require(path.resolve('./controllers/authorize')),
      careControllers = require(path.resolve('./controllers/cares')),
      careValidators = require(path.resolve('./controllers/validators/cares'));

const router = express.Router();

router.route('/:id/cares')
  .post(authorize.onlyLogged, careValidators.post, careControllers.post);

router.route('/:id/cares/care')
  .delete(authorize.onlyLogged, careValidators.del, careControllers.del);

module.exports = router;
