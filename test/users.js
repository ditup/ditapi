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
    models = require(path.resolve('./models')),
    config = require(path.resolve('./config/config')),
    dbHandle = require(path.resolve('./test/handleDatabase')),
    mailer = require(path.resolve('./services/mailer'));

var agent = supertest.agent(app);

var maildev, incomingMail;


describe('/users', function () {
  // set mailer at the beginning
  before(function (done) {
    maildev = new MailDev({
      smtp: 1025
    });

    maildev.listen(function (err) {
      if (err) return done(err);
      return done();
    });
  });

  /**
   * @todo better description
   * mail event (probably to know that the email was sent)
   */
  before(function () {
    maildev.on('new', function (email) {
      mailEmitter.emit('mail', email);
    }); 
  });

  // unset mailer at the end
  after(function (done) {
    maildev.end(function (err) {
      if(err) return done(err);
      return done();
    });
  });

  // clear database after every test
  afterEach(function () {
    return dbHandle.clear();
  });

  describe('POST', function () {

    context('good data', function () {

      // valid user data
      let user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      // valid user data to POST as JSON API
      let userData = {
        data: {
          type: 'users',
          attributes: user
        }
      };

      // link to the created user
      let selfLink = `${config.url.all}/users/${user.username}`;

      it('should respond properly', async function () {

        let res = await agent
          .post('/users')
          .send(userData)
          .set('Content-Type', 'application/vnd.api+json')
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect('Location', selfLink)
          .expect(201);

        res.body.should.have.property('data');
        res.body.data.should.have.property('id', user.username);
        res.body.links.should.have.property('self', selfLink);
        res.body.data.attributes.should.have.property('username', user.username);
      });

      it('should create a new user', async function () {

        // POST a new user
        let res = await agent
          .post('/users')
          .send(userData)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(201);

        // GET the new user in another request to test its presence
        await agent
          .get(`/users/${res.body.data.id}`)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(200);
      });

      it('should send a verification email', async function () {

        await agent
          .post('/users')
          .send(userData)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(201);

        // wait for the 'mail' event
        await new Promise(function (resolve, reject) {
          mailEmitter.once('mail', function (email) {
            email.should.have.property('from');
            email.should.have.property('to');
            email.should.have.property('text');
            return resolve();
          });
        });
      });
    });

    it('[bad username] should respond with error', async function () {

      // user data with invalid username
      let user = {
        username: 'test*',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      // the above in JSON API format
      let userData = {
        data: {
          type: 'users',
          attributes: user
        }
      }

      let res = await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      // TODO better, more detailed errors
      res.body.should.have.property('errors');
    });

    it('[existing username] should respond with error', async function () {
      var userData = {
        data: {
          type: 'users',
          attributes: {
            username: 'test',
            password: 'asdfasdf',
            email: 'test@example.com'
          }
        }
      };

      await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(201);

      let res = await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(409); // Conflict

      res.body.should.have.property('errors');
    });

    it('[bad email] should respond with error', async function () {
      let userData = {
        data: {
          type: 'users',
          attributes: {
            username: 'test',
            password: 'asdfasdf',
            email: 'test@example'
          }
        }
      };

      let res = await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      res.body.should.have.property('errors');
    });

    it('[existent email] should respond with error', async function () {
      let user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      let userData = {
        data: {
          type: 'users',
          attributes: user
        }
      };

      // the second user has the same email as the user
      let user2 = {
        username: 'test2',
        password: 'asdfasdf',
        email: 'test@example.com' // the same email
      };

      let userData2 = {
        data: {
          type: 'users',
          attributes: user2
        }
      };


      // post the first user
      let userResponse = await agent.post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(201);

      // verify the first user
      await models.user.finalVerifyEmail(user.username);

      // post the 2nd user and test
      let user2Response = await agent
        .post('/users')
        .send(userData2)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(409); // Conflict

      user2Response.body.should.have.property('errors');
    });
  });

  describe('GET', function () {
    it('should get lists of users (specified by query)');
  });
});
