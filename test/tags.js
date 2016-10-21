'use strict';

let supertest = require('supertest'),
    should = require('should'),
    path = require('path'),
    _ = require('lodash'),
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
    loggedUser;


describe('/tags', function () {

  // clear database after every test
  afterEach(function () {
    return co(function* () {
      yield dbHandle.clear();
    });
  });

  describe('GET', function () {
    it('should show lists of tags');
  });

  describe('POST', function () {

    let newTag = {
      tagname: 'test-tag',
      description: 'this is a tag description!'
    };

    let serializedNewTag = serialize.newTag(newTag);

    let invalidTagname = {
      tagname: 'test--tag',
      description: 'this is a tag description!'
    };

    let serializedInvalidTagname = serialize.newTag(invalidTagname);


    // put pre-data into database
    beforeEach(function () {
      return co(function* () {
        let data = {
          users: 3, // how many users to make
          verifiedUsers: [0, 1], // which  users to make verified
          tags: 7
        }
        // create data in database
        dbData = yield dbHandle.fill(data);

        loggedUser = dbData.users[0];
      });
    });

    context('logged in', function () {
      it('[good data] should create a tag and respond with 201', function () {
        return co(function* () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .post(`/tags`)
              .send(serializedNewTag)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${loggedUser.username}:${loggedUser.password}`)
                  .toString('base64'))
              .expect(201)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });

          // check that the newly created tag is there
          let tag = yield models.tag.read(newTag.tagname);

          (typeof tag).should.equal('object');
          tag.should.have.property('tagname', newTag.tagname);
          tag.should.have.property('description', newTag.description);
        });
      });

      it('[invalid tagname] should error with 400', function () {
        return co(function* () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .post(`/tags`)
              .send(serializedInvalidTagname)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${loggedUser.username}:${loggedUser.password}`)
                  .toString('base64'))
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
        });
      });

      it('[duplicate tagname] should error with 409', function () {
        return co(function* () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .post(`/tags`)
              .send(serialize.newTag(dbData.tags[0]))
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${loggedUser.username}:${loggedUser.password}`)
                  .toString('base64'))
              .expect(409)
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .end(function (err, res) {
                if (err) return reject(err);
                return resolve(res);
              });
          });
        });
      });

      it('[invalid description]', function () {
        let longDescription = _.repeat('.', 2049);
        return co(function* () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .post(`/tags`)
              .send(serialize.newTag({
                tagname: 'new-tag',
                description: longDescription
              }))
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${loggedUser.username}:${loggedUser.password}`)
                  .toString('base64'))
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

    context('not logged in', function () {
      it('should say 403 Forbidden', function () {
        return co(function* () {
          let response = yield new Promise(function (resolve, reject) {
            agent
              .post(`/tags`)
              .send(serializedNewTag)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Basic '+
                new Buffer(`${loggedUser.username}:${loggedUser.password}a`)
                  .toString('base64'))
              .expect(403)
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
});

describe('/tags/:tagname', function () {
  describe('GET', function () {
    it('should show the tag');
  });

  describe('PATCH', function () {
    it('should update the tag (description, not tagname)');
  });

  describe('DELETE', function () {
    it('should delete the tag (when sufficient rights)');
  });
});

/*
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
      return co(function* () {
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
      return co(function* () {
        yield dbHandle.clear();
      });
    });
    context('[user exists]', function () {
      it('[logged] should read user`s profile', function () {
        return co(function* () {
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
        return co(function* () {
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
        return co(function* () {
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
        return co(function* () {
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
        return co(function* () {
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
        return co(function* () {
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

  describe('PATCH', function () {
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

*/
