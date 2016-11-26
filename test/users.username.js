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


describe('/users/:username', function () {
  describe('GET', function () {
    beforeEach(function () {
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
      });

    });

    afterEach(function () {
      return co(function * () {
        yield dbHandle.clear();
      });
    });

    context('[user exists]', function () {
      it('[logged] should read user`s profile', function () {
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
        });
      });

      it('[not logged] should read simplified profile', function () {
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
        });
      });

      it('[logged, not verified] should read simplified profile', function () {
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
        });
      });

      it('[logged, unverified] should read her own profile full', function () {
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
        });
      });
    });

    context('[user doesn\'t exist]', function () {
      it('should show 404', function () {
        return co(function * () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .get(`/users/${nonexistentUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${loggedUser.username}:${loggedUser.password}`)
                  .toString('base64'))
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
        });
      });
    });

    context('[username is invalid]', function () {
      it('should show 400', function () {
        return co(function * () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .get(`/users/this--is-an-invalid--username`)
              .set('Content-Type', 'application/vnd.api+json')
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
        });
      });
    });
  });

  describe.only('PATCH', function () {
    let loggedUser;

    beforeEach(function () {
      return co(function * () {
        let data = {
          users: 1, // how many users to make
          verifiedUsers: [] // which  users to make verified
        }
        // create data in database
        dbData = yield dbHandle.fill(data);

        loggedUser = dbData.users[0];
      });
    });

    afterEach(function () {
      return co(function * () {
        yield dbHandle.clear();
      });
    });

    context('logged in', function () {
      context('the edited user is the logged user', function () {
        // profile fields are givenName, familyName, description, birthday
        //
        it('should update 1 profile field', async function () {
          let res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  givenName: 'new-given-name'
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          let dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('username', loggedUser.username);
          should(dt.attributes).have.property('givenName', 'new-given-name');
        });

        it('should save multiple profile fields');
        it('should error when profile fields are mixed with settings or email');
        it('should fail when not valid data provided');
      });

      context('the edited user is not the logged one', function () {
        it('should error with 403 Not Authorized');
      });
    });

    context('not logged in', function () {
      it('should error with 403 Not Authorized');
    });
    it('should update user profile');
  });

  describe('DELETE', function () {
    it('should delete user and all her graph connections');
    it('should delete user\'s profile picture');
  });

  describe('HEAD', function () {
    it('should return header of GET request');
  });
});
