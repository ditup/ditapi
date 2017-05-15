'use strict';

const express = require('express'),
      path = require('path');

const contactController = require(path.resolve('./controllers/contacts'));

const router = express.Router();

// basic authenticator
router.route('/')
  .post(contactController.postContacts);

module.exports = router;
