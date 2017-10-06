'use strict';

process.env.NODE_ENV = 'test';

const supertest = require('supertest'),
      should = require('should');



// to override calls in routes
const proxyquire = require('proxyquire'); 
// for creating stubbed function for overrides
const sinon = require('sinon');

describe('GET /token/auth', function () {
  let app;
});