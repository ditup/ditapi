'use strict';

process.env.NODE_ENV = 'test';

let supertest = require('supertest'),
    should = require('should'),
    path = require('path'),
    co = require('co');

let app = require(path.resolve('./app')),
    serializers = require(path.resolve('./serializers')),
    models = require(path.resolve('./models')),
    dbHandle = require(path.resolve('./test/handleDatabase')),
    config = require(path.resolve('./config/config'));

let deserialize = serializers.deserialize;
let serialize = serializers.serialize;

let agent = supertest.agent(app);

let dbData,
    existentUser,
    loggedUser,
    unverifiedUser,
    nonexistentUser = {
      username: 'nonexistent-user',
      email: 'nonexistent-email@example.com',
    };


describe('/users/username', function () {
  describe('GET', function () {
    beforeEach(function (done) {
      return co(function * () {
        let data = {
          users: 3, // how many users to make
          verifiedUsers: [0, 1] // which  users to make verified
        }
        // create data in database
        dbData = yield dbHandle.fill(data);

        existentUser = dbData.users[0];
        loggedUser = dbData.users[1];
        unverifiedUser = dbData.users[2];
        return done();
      });

    });

    afterEach(function (done) {
      return co(function * () {
        yield dbHandle.clear();
        return done();
      });
    });
    context('[user exists]', function () {
      it('[logged] should read user`s profile', function (done) {
        return co(function * () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .get(`/users/${existentUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${loggedUser.username}:${loggedUser.password}`)
                  .toString('base64'))
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
          
          let user = response.body;
          user.should.have.property('data');
          user.data.should.have.property('type', 'users');
          user.data.should.have.property('id', existentUser.username);
          user.data.should.have.property('attributes');
          let fields = user.data.attributes;
          fields.should.have.property('username', existentUser.username);
          fields.should.have.property('givenName');
          // TODO givenName, familyName, birthDate, profile, ...
          return done();
        })
        .catch(done);
      });

      it('[not logged] should read simplified profile', function (done) {
        return co(function * () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .get(`/users/${existentUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
          
          let user = response.body;
          user.should.have.property('data');
          user.data.should.have.property('type', 'users');
          user.data.should.have.property('id', existentUser.username);
          user.data.should.have.property('attributes');

          let fields = user.data.attributes;
          fields.should.have.property('username', existentUser.username);
          fields.should.not.have.property('givenName');
          return done();
        })
        .catch(done);
      });

      it('[logged, not verified] should read simplified profile', function (done) {
        return co(function * () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .get(`/users/${existentUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${unverifiedUser.username}:${unverifiedUser.password}`)
                  .toString('base64'))
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
          
          let user = response.body;
          user.should.have.property('data');
          user.data.should.have.property('type', 'users');
          user.data.should.have.property('id', existentUser.username);
          user.data.should.have.property('attributes');

          let fields = user.data.attributes;
          fields.should.have.property('username', existentUser.username);
          fields.should.not.have.property('givenName');
          return done();
        })
        .catch(done);
      });

      it('[logged, unverified] should read her own profile full', function (done) {
        return co(function * () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .get(`/users/${unverifiedUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${unverifiedUser.username}:${unverifiedUser.password}`)
                  .toString('base64'))
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
          
          let user = response.body;
          user.should.have.property('data');
          user.data.should.have.property('type', 'users');
          user.data.should.have.property('id', unverifiedUser.username);
          user.data.should.have.property('attributes');

          let fields = user.data.attributes;
          fields.should.have.property('username', unverifiedUser.username);
          fields.should.have.property('givenName');
          return done();
        })
        .catch(done);
      });
    });
    context('[user doesn\'t exist]', function () {
      it('should show 404');
    });
    context('[username is invalid]', function () {
      it('should show 400');
    });
  });

  describe('PATCH', function () {});
  describe('DELETE', function () {});
  describe('HEAD', function () {});
});
