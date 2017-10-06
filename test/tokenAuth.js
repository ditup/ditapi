'use strict';

process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken'),
      path = require('path'),
      supertest = require('supertest'),
      should = require('should');
const app = require(path.resolve('./app')),
      dbHandle = require(path.resolve('./test/handleDatabase')),
      jwtConfig = require(path.resolve('./config/secret/jwt-config'));

const agent = supertest.agent(app);

describe.only('/auth/token', function() {
  let dbData;
  let verifiedUser;
  let unverifiedUser;
  const nonexistentUser = {
    username: 'nonexistent',
    password: 'nonexistent'
  };
  beforeEach(async function () {
    const data = {
      users: 2, // how many users to make
      verifiedUsers: [0] // which  users to make verified
    };
    // create data in database
    dbData = await dbHandle.fill(data);

    verifiedUser = dbData.users[0];
    unverifiedUser = dbData.users[1];
  });

  afterEach(async function () {
    await dbHandle.clear();
  });

  describe('GET /auth/token', function() {
  	context('request with valid Authentication header', function() {
  		it('should respond with 200 Success', async function() {
        const resp = await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, verifiedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
  		it('should respond with correct jwt token in the header', async function() {
        const jwtPayload = {
          username: verifiedUser.username,
        };
        const generatedToken = jwt.sign(jwtPayload, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
        const response = await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, verifiedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
        const token = response.body.meta.token;
        const decodedData = await jwt.verify(token, jwtConfig.jwtSecret);
        console.log('decoded', decodedData);
        decodedData.username.should.equal(verifiedUser.username);
        const difference = decodedData.exp - decodedData.iat;
        difference.should.equal(jwtConfig.expirationTime/1000);
      });
  	});

  	context('request with incorrect password', function () {
  		it('should respond with 403', async function() {
        const resp = await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, 'incorrectPassword')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
  	});

  	context('request with nonexistent username', function() {
  		it('should respond with 401', async function() {
        const resp = await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth('nonexistentUser', verifiedUser.password)
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
  	});

  	context('request without Authentication header', function() {
  		it('should respond with 401', async function() {
        const resp = await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
  	});

  	context('the user has unverified email', function () {
  		// TODO is it needed at this point?
  	});

  	context('the user has verified email', function () {
  		// TODO is it needed at this point?
  	});

  });


});