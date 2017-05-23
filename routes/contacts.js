'use strict';

const express = require('express'),
      path = require('path');

const contactController = require(path.resolve('./controllers/contacts'));
const validators = require(path.resolve('./controllers/validators'));
const authorize = require(path.resolve('./controllers/authorize'));

const router = express.Router();

// basic authenticator
router.route('/')
  .get(authorize.onlyLogged, contactController.getContacts)
  .post(authorize.onlyLogged, validators.contacts.post, contactController.postContacts);

router.route('/:from/:to')
  .patch(authorize.onlyLogged, validators.contacts.patchConfirm, contactController.patchConfirmContact)
  .get(authorize.onlyLogged, validators.contacts.getOne, contactController.getContact)
  .delete(authorize.onlyLogged, validators.contacts.getOne, contactController.deleteContact);

module.exports = router;
