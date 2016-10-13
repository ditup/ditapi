'use strict';

process.env.NODE_ENV = 'test';

var supertest = require('supertest'),
    should = require('should'),
    path = require('path');

var app = require(path.resolve('./app')),
    serializers = require(path.resolve('./serializers')),
    config = require(path.resolve('./config/config'));

var deserialize = serializers.deserialize;
var serialize = serializers.serialize;

var agent = supertest.agent(app);


describe('users', function () {
  describe('POST /users', function () {
    it('[good data] should create the user and respond properly', function (done) {
      var user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      var apiUser = serialize.newUser(user);

      agent
        .post('/users')
        .send(apiUser)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          try {
            res.body.should.have.property('data');
            res.body.data.should.have.property('id', user.username);
          } catch (e) {
            return done(e);
          }

          deserialize(res.body, function (err, user) {
            if (err) return done(err);
            try {
              user.should.have.property('username', user.username);
            } catch (e) {
              return done(e);
            }
            return done();
          });
        });
    });

    it('[bad username] should respond with error', function (done) {
      var user = {
        username: 'test*',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      var apiUser = serialize.newUser(user);

      agent
        .post('/users')
        .send(apiUser)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          try {
            res.body.should.have.property('errors');
            return done();
          } catch (e) {
            return done(e);
          }
        });
    });
  });
});
