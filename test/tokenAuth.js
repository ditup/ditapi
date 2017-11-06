'use strict';

const jwt = require('jsonwebtoken'),
      path = require('path'),
      sinon = require('sinon'),
      supertest = require('supertest');

const app = require(path.resolve('./app')),
      config = require(path.resolve('./config')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const agent = supertest.agent(app);

const jwtSecret = config.jwt.secret;
const jwtExpirationTime = config.jwt.expirationTime;

describe('/auth/token', function() {
  let dbData, verifiedUser, sandbox;
  beforeEach(async function () {
    const data = {
      users: 2, // how many users to make
      verifiedUsers: [0] // which  users to make verified
    };
    // create data in database
    dbData = await dbHandle.fill(data);
    verifiedUser = dbData.users[0];
    sandbox = sinon.sandbox.create();
  });

  afterEach(async function () {
    await dbHandle.clear();
    sandbox.restore();
  });

  describe('GET /auth/token', function() {
    context('request with valid Authentication header', function() {
      it('should respond with 200 Success', async function() {
        await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, verifiedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
      it('should respond with correct jwt token in the header', async function() {
        const response = await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, verifiedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
        const token = response.body.meta.token;
        const decodedData = await jwt.verify(token, jwtSecret);
        decodedData.username.should.equal(verifiedUser.username);
        const difference = decodedData.exp - decodedData.iat;
        difference.should.equal(jwtExpirationTime);
      });
    });


    context('request with incorrect password', function () {
      it('should respond with 401', async function() {
        await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, 'incorrectPassword')
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request with nonexistent username', function() {
      it('should respond with 401', async function() {
        await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth('nonexistentUser', verifiedUser.password)
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request without Authentication header', function() {
      it('should respond with 401', async function() {
        await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request with invalid username', function() {
      it('should respond with 401', async function() {
        await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth('2000', verifiedUser.password)
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request with additional parameter', function() {
      it('should respond with 400', async function() {
        await agent
          .get('/auth/token?filter[tag]=tag1,tag2')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(verifiedUser.username, verifiedUser.password)
          .expect(400)
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

describe('authorizing path for logged users', function() {
  describe('authorize show new users path', function () {
    let dbData,
        loggedUser, userToken, sandbox;

    // seed the database with users
    beforeEach(async function () {
      await dbHandle.clear();
      const data = {
        users: 10,
        verifiedUsers: [0, 1, 2, 4, 5, 6, 9]
      };
      // create data in database
      dbData = await dbHandle.fill(data);
      [loggedUser] = dbData.users;

      sandbox = sinon.sandbox.create();

      const jwtPayload = {username: loggedUser.username, verified:loggedUser.verified, givenName:'', familyName:''};
      userToken = jwt.sign(jwtPayload, jwtSecret, { algorithm: 'HS256', expiresIn: jwtExpirationTime });
    });

    afterEach(async function () {
      await dbHandle.clear();
      sandbox.restore();
    });

    context('logged in', function () {
      context('valid data', function () {
        // TODO limit shoud be set or given in query?
        // diff query /users?filter[newUsers]=<limit>
        it('show new users should return 200', async function () {
          await agent
            .get('/users?sort=-created&page[offset]=0&page[limit]=5')
            .set('Content-Type', 'application/vnd.api+json')
            .set('Authorization', 'Bearer ' + userToken)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);
        });
      });
    });
    context('not logged in', function () {
      context('valid data', function () {
        // TODO limit shoud be set or given in query?
        // diff query /users?filter[newUsers]=<limit>
        it('show new users should return 403', async function () {
          await agent
            .get('/users?sort=-created&page[offset]=0&page[limit]=5')
            .set('Content-Type', 'application/vnd.api+json')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(403);
        });
      });
      context('invalid data', function () {
        // TODO limit shoud be set or given in query?
        // diff query /users?filter[newUsers]=<limit>
        it('show new users with uncorrect token 403', async function () {
          await agent
            .get('/users?sort=-created&page[offset]=0&page[limit]=5')
            .set('Content-Type', 'application/vnd.api+json')
            .set('Authorization', 'Bearer ' + 'wrongToken')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(403);
        });
      });
    });
  });
});
describe('authorizing path for logged \'as me\'', function () {
  let loggedUser, otherUser, dbData, userToken;

  beforeEach(async function () {
    const data = {
      users: 2, // how many users to make
      verifiedUsers: [0] // which  users to make verified
    };
    // create data in database
    dbData = await dbHandle.fill(data);

    [loggedUser, otherUser] = dbData.users;
    const jwtPayload = {username: loggedUser.username, verified:loggedUser.verified, givenName:'', familyName:''};
    userToken = jwt.sign(jwtPayload, jwtSecret, { algorithm: 'HS256', expiresIn: jwtExpirationTime });
  });

  afterEach(async function () {
    await dbHandle.clear();
  });

  context('logged in', function () {
    context('the edited user is the logged user', function () {
      // profile fields are givenName, familyName, description, birthday
      //
      it('should update 1 profile field', async function () {
        await agent
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
          .set('Authorization', 'Bearer ' + userToken)
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(200);
      });
    });

    context('the edited user is not the logged one', function () {
      it('should error with 403', async function () {
        await agent
          .patch(`/users/${otherUser.username}`)
          .send({
            data: {
              type: 'users',
              id: otherUser.username,
              attributes: {
                givenName: 'new-given-name'
              }
            }
          })
          .set('Authorization', 'Bearer ' + userToken)
          .set('Content-Type', 'application/vnd.api+json')
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(403);
      });
    });
  });

  context('not logged in', function () {
    it('should error with 403 Not Authorized', async function () {
      await agent
        .patch(`/users/${otherUser.username}`)
        .send({
          data: {
            type: 'users',
            id: otherUser.username,
            attributes: {
              givenName: 'new-given-name'
            }
          }
        })
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(403);
    });
  });
});