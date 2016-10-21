'use strict';

process.env.NODE_ENV = 'test';

let path = require('path'),
    supertest = require('supertest'),
    should = require('should'),
    co = require('co');

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

    afterEach(function () {
      return co(function * () {
        yield dbHandle.clear();
      });
    });

    it('[correct code] should make the user\'s email verified', function () {
      return co(function * () {
        let out = yield models.user.create({
          username: 'test',
          password: 'asdfasdf',
          email: 'test@example.com'
        });
        
        yield new Promise(function (resolve, reject) {
          agent
            .get(`/users/test/account/email/verify/${out.emailVerifyCode}`)
            .set('Content-Type', 'application/vnd.api+json')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200)
            .end(function (err, res) {
              if (err) return reject(err);
              return resolve(res);
            });
        });

        let user = yield models.user.read('test');

        user.should.have.property('email', 'test@example.com');
        user.should.have.property('account');
        user.account.should.have.property('email', null);

             /* 
              function (err, res) {
              if (err) return done(err);
              try {
                res.body.should.have.property('data');
                res.body.data.should.have.property('id', user.username);
                res.body.links.should.have.property('self', selfLink);
              } catch (e) {
                return done(e);
              }
          */
      });
    });

    it('[wrong code] should error');
    it('[expired code] should error');
    it('[reused code] should error');
  });
  
});

