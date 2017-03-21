'use strict';

const path = require('path'),
      express = require('express');
const router = express.Router();

const messageController = require(path.resolve('./controllers/messages'));
const validators = require(path.resolve('./controllers/validators'));
const authorize = require(path.resolve('./controllers/authorize'));
// post a new tag
router.route('/')
  .post(authorize.onlyLogged, validators.messages.post, messageController.postMessages);

router.route('/:id');

module.exports = router;
