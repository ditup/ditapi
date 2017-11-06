'use strict';

const tags = require('./tags');
const userTags = require('./user-tags');
const users = require('./users');
const account = require('./account');
const contacts = require('./contacts');
const messages = require('./messages');
const avatar = require('./avatar');
const authenticate = require('./authenticate');
const params = require('./params');

const definitions = require('./definitions');

module.exports = Object.assign({ definitions }, account, contacts, messages, tags, userTags, users, avatar, authenticate, params);
