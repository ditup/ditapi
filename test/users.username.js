'use strict';

process.env.NODE_ENV = 'test';

let supertest = require('supertest'),
    should = require('should'),
    path = require('path'),
    co = require('co');

let app = require(path.resolve('./app')),
    serializers = require(path.resolve('./serializers')),
    models = require(path.resolve('./models')),
    config = require(path.resolve('./config/config'));

let deserialize = serializers.deserialize;
let serialize = serializers.serialize;

let agent = supertest.agent(app);

describe('/users/username', function () {
  describe('GET', function () {
    beforeEach(function (done) {
      
      // create data in database
      return done();
    });
    afterEach(function (done) {
      // clear data from database
    })
    it('[logged] should read user`s profile');
    it('[not logged] should read simplified profile');
  });

  describe('PATCH', function () {});
  describe('DELETE', function () {});
  describe('HEAD', function () {});
});
