'use strict';

process.env.NODE_ENV = 'test';

let path = require('path'),
    supertest = require('supertest'),
    should = require('should');

let app = require(path.resolve('./app')),
    models = require(path.resolve('./models')),
    dbHandle = require(path.resolve('./test/handleDatabase'));

var agent = supertest.agent(app);

describe('/users/:username/account...', function () {
  describe('./', function () {
    describe('GET', function () {
      it('get a basic account info (email)');
    });
  });

  describe('./password', function () {
    describe('PUT', function () {
      it('change password');
    });
  });

  describe('./password/forgotten', function () {
    // this should be done with CAPTCHA
    describe('GET?', function () {
      it('send email for changing password');
    });
  });

  describe('./password/forgotten/:code', function () {
    describe('GET?', function () {
      it('change the password');
    });
  });

  describe('./email', function () {
    describe('GET', function () {
      it(`get user's  email`);
    });

    describe('PUT', function () {
      it(`change user's email`);
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
      let out = await models.user.create({
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      });

      // we verify the email
      let res = await agent
        .get(`/users/test/account/email/verify/${out.emailVerifyCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(200);

      // see whether the user's email is verified now
      let user = await models.user.read('test');

      user.should.have.property('email', 'test@example.com');
      user.should.have.property('account');
      user.account.should.have.property('email', null);
    });

    it('[wrong code] should error', async function () {
      // first we create a new user
      let out = await models.user.create({
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      });

      let badCode = 'aa2345';
      
      // we verify the email
      let res = await agent
        .get(`/users/test/account/email/verify/${badCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      // see whether the user's email is verified now
      let user = await models.user.read('test');

      user.should.have.property('email', null);
    });

    it('[expired code] should error');

    it('[reused code] should error', async function () {
      // first we create a new user
      let out = await models.user.create({
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      });

      // we verify the email
      let res = await agent
        .get(`/users/test/account/email/verify/${out.emailVerifyCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(200);

      let res2 = await agent
        .get(`/users/test/account/email/verify/${out.emailVerifyCode}`)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);
    });
  });
  
});

