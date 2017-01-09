'use strict';

process.env.NODE_ENV = 'test';

let path = require('path'),
    supertest = require('supertest'),
    should = require('should');

let app = require(path.resolve('./app')),
    models = require(path.resolve('./models')),
    dbHandle = require(path.resolve('./test/handleDatabase'));

var agent = supertest.agent(app);

describe('/auth', function () {
  let dbData;
  let verifiedUser;
  let unverifiedUser;
  let nonexistentUser = {
    username: 'nonexistent',
    password: 'nonexistent'
  };

  beforeEach(async function () {
    let data = {
      users: 2, // how many users to make
      verifiedUsers: [0] // which  users to make verified
    }
    // create data in database
    dbData = await dbHandle.fill(data);

    verifiedUser = dbData.users[0];
    unverifiedUser = dbData.users[1];
  });

  afterEach(async function () {
    await dbHandle.clear();
  });

  describe('GET /auth/basic', function () {
    context('request without Authentication header', function () {
      it('should respond with 401 Not Authorized', async function () {
        let response = await agent
          .get(`/auth/basic`)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request with nonexistent username', function () {
      it('should respond with 401 Not Authorized', async function () {
        let response = await agent
          .get(`/auth/basic`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(nonexistentUser.username, nonexistentUser.password)
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request with wrong password', function () {
      it('should respond with 401 Not Authorized', async function () {
        let response = await agent
          .get(`/auth/basic`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, 'wrong password')
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request with valid Authentication header', function () {
      it('should respond with 200 Success', async function () {
        let response = await agent
          .get(`/auth/basic`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, verifiedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('the body should contain data of the authenticated user', async function () {
        let response = await agent
          .get(`/auth/basic`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, verifiedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
        
        let user = response.body;
        user.should.have.property('data');
        user.data.should.have.property('type', 'users');
        user.data.should.have.property('id', verifiedUser.username);
        user.data.should.have.property('attributes');
        let fields = user.data.attributes;
        fields.should.have.property('username', verifiedUser.username);
        fields.should.have.property('givenName');
        fields.should.have.property('familyName');
      });

      context('the user has unverified email', function () {
        it('email in attributes should be null', async function () {
          let response = await agent
            .get(`/auth/basic`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(unverifiedUser.username, unverifiedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
          
          let user = response.body;
          user.should.have.property('data');
          user.data.should.have.property('attributes');
          user.data.attributes.should.have.property('email', null);
        });
      });
      context('the user has verified email', function () {
        it('should contain the verified email in attributes', async function () {
          let response = await agent
            .get(`/auth/basic`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(verifiedUser.username, verifiedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
          
          let user = response.body;
          user.should.have.property('data');
          user.data.should.have.property('attributes');
          user.data.attributes.should.have.property('email', verifiedUser.email);
        });
      });
    });
  });
});
