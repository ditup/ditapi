'use strict';

const express = require('express'),
      path = require('path');

const // authorize = require(path.resolve('./controllers/authorize')),
      watchControllers = require(path.resolve('./controllers/watches'));
      // voteValidators = require(path.resolve('./controllers/validators/votes'));

// create router and controllers
const router = express.Router();

router.route('/:id/watches')
  .post(/* authorize.onlyLogged, voteValidators.post,*/ watchControllers.post);

// router.route('/:id/watches/watch')
//   .delete(authorize.onlyLogged, voteValidators.del, voteControllers.del);

module.exports = router;
