'use strict';

process.env.NODE_ENV = 'test';

const path = require('path'),
      supertest = require('supertest'),
      should = require('should');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const agent = supertest.agent(app);

describe('/users/:username/account...', function () {
  describe('./', function () {
    describe('GET', function () {
      it('get a basic account info (email)');
    });
  });

  describe('./email', function () {
    describe('GET', function () {
      it('get user\'s  email');
    });

    describe('PUT', function () {
      it('change user\'s email');
      it('send verification email');
    });
  });

  describe('./email/verify/:code', function () {

    // empty the test database after every test
    afterEach(async function () {
      await dbHandle.clear();
    });

    it('[correct code] should make the user\'s email verified', async function () {
      // first we create a new user
      const out = await models.user.create({
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      });

      // we verify the email
      await agent
        .get(`/users/test/account/email/verify/${out.emailVerifyCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(200);

      // see whether the user's email is verified now
      const user = await models.user.read('test');

      should(user).have.property('email', 'test@example.com');
      should(user).have.property('account');
      should(user.account).have.property('email', null);
    });

    it('[wrong code] should error', async function () {
      // first we create a new user
      await models.user.create({
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      });

      const badCode = 'aa2345';

      // we verify the email
      await agent
        .get(`/users/test/account/email/verify/${badCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      // see whether the user's email is verified now
      const user = await models.user.read('test');

      user.should.have.property('email', null);
    });

    it('[expired code] should error');

    it('[reused code] should error', async function () {
      // first we create a new user
      const out = await models.user.create({
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      });

      // we verify the email
      await agent
        .get(`/users/test/account/email/verify/${out.emailVerifyCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(200);

      await agent
        .get(`/users/test/account/email/verify/${out.emailVerifyCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);
    });
  });

});

