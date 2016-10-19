'use strict';

process.env.NODE_ENV = 'test';

const supertest = require('supertest'),
      should = require('should'),
      path = require('path'),
      co = require('co'),
      MailDev = require('maildev'),
      EventEmitter = require('events');

class MailEmitter extends EventEmitter {}
const mailEmitter = new MailEmitter();

var app = require(path.resolve('./app')),
    serializers = require(path.resolve('./serializers')),
    models = require(path.resolve('./models')),
    config = require(path.resolve('./config/config')),
    mailer = require(path.resolve('./services/mailer'));

var deserialize = serializers.deserialize;
var serialize = serializers.serialize;

var agent = supertest.agent(app);

var maildev, incomingMail;


describe('/users', function () {
  before(function (done) {
    maildev = new MailDev({
      smtp: 1025
    });

    maildev.listen(function (err) {
      if (err) return done(err);
      return done();
    });
  });

  before(function () {
    maildev.on('new', function (email) {
      mailEmitter.emit('mail', email);
    }); 
  });

  after(function (done) {
    maildev.end(function (err) {
      if(err) return done(err);
      return done();
    });
  });
  afterEach(function (done) {
    models.user.db.query('FOR u IN users REMOVE u IN users').then(function () {
      done();
    });
  });

  describe('POST', function () {
    it('[good data] should respond properly', function (done) {
      var user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      var apiUser = serialize.newUser(user);
      var selfLink = `${config.url.all}/users/${user.username}`;

      agent
        .post('/users')
        .send(apiUser)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect('Location', selfLink)
        .expect(201)
        .end(function (err, res) {
          if (err) return done(err);
          try {
            res.body.should.have.property('data');
            res.body.data.should.have.property('id', user.username);
            res.body.links.should.have.property('self', selfLink);
          } catch (e) {
            return done(e);
          }

          deserialize(res.body, function (err, user, more) {
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

    it('[good data] should create a new user', function (done) {
      var user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      var apiUser = serialize.newUser(user);
      var selfLink = `${config.url.all}/users/${user.username}`;

      agent
        .post('/users')
        .send(apiUser)
        .set('Content-Type', 'application/vnd.api+json')
        .expect(201)
        .end(function (err, res) {
          agent.get(`/users/${res.body.data.id}`)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(200)
            .end(done);
        });
    });

    it('[good data] should send a verification email', function (done) {
      return co(function * () {
        var user = {
          username: 'test',
          password: 'asdfasdf',
          email: 'test@example.com'
        };

        var apiUser = serialize.newUser(user);
        var selfLink = `${config.url.all}/users/${user.username}`;

        yield new Promise(function (resolve, reject) {
          agent
            .post('/users')
            .send(apiUser)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(201)
            .end(function (err, res) {
              if (err) return reject(err);
              return resolve(err);
            });
        });

        mailEmitter.once('mail', function (email) {
          console.log(email.from, email.to, email.text);
          return done();
        });
      })
      .catch(done);
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

    it('[existing username] should respond with error', function (done) {
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
          agent
            .post('/users')
            .send(apiUser)
            .set('Content-Type', 'application/vnd.api+json')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(409) // Conflict
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

    it('[bad email] should respond with error', function (done) {
      var user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example'
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

    it('[existent email] should respond with error', function (done) {
      return co(function * () {
        var user = {
          username: 'test',
          password: 'asdfasdf',
          email: 'test@example.com'
        };

        var user2 = {
          username: 'test2',
          password: 'asdfasdf',
          email: 'test@example.com' // the same email
        };

        var apiUser = serialize.newUser(user);
        var apiUser2 = serialize.newUser(user2);

        // post the first user
        let userResponse = yield new Promise(function (resolve, reject) {
          agent.post('/users')
            .send(apiUser)
            .set('Content-Type', 'application/vnd.api+json')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(201)
            .end(function (err, resp) {
              if (err) return reject(err);
              return resolve(resp);
            });
        });

        // verify the first user
        yield models.user.finalVerifyEmail(user.username);

        // post the 2nd user and test
        let user2Response = yield new Promise(function (resolve, reject) {
          agent
            .post('/users')
            .send(apiUser2)
            .set('Content-Type', 'application/vnd.api+json')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(409) // Conflict
            .end(function (err, resp) {
              if (err) return reject(err);
              return resolve(resp);
            });
        });


        // testing on response body
        user2Response.body.should.have.property('errors');

        return done();
      }).catch(done);
    });
  });

  describe('GET', function () {
    it('should show users');
  });
});
