var express = require('express');
var router = express.Router();
var path = require('path');
var userController = require(path.resolve('./controllers/users'));
var validators = require(path.resolve('./controllers/validators'));

/* GET users listing. */
router.route('/')
  .post(validators.postUsers, userController.postUsers);

module.exports = router;
