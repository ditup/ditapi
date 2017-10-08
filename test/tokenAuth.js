'use strict';

process.env.NODE_ENV = 'test';

const jwt = require('jsonwebtoken'),
      path = require('path'),
      supertest = require('supertest'),
      should = require('should');
const app = require(path.resolve('./app')),
      dbHandle = require(path.resolve('./test/handleDatabase')),
      jwtConfig = require(path.resolve('./config/secret/jwt-config')),
      validators = require(path.resolve('./controllers/validators'));

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

    context('request with invalid username', function() {
      it('should respond with 401', async function() {
        const resp = await agent
          .get('/auth/token')
          .set('Content-Type', 'application/vnd.api+json')
          .auth('2000', verifiedUser.password)
          .expect(401)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('request with additional parameter', function() {
      it('should respond with 400', async function() {
        const resp = await agent
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

describe.only('authorizing path for logged users', function() {
    describe('authorize show new users path', function () {
      let dbData,
          loggedUser, userToken;

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

        const jwtPayload = {username: loggedUser.username};
        userToken = jwt.sign(jwtPayload, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
      });

      afterEach(async function () {
        await dbHandle.clear();
      });

      context('logged in', function () {
        context('valid data', function () {
          // TODO limit shoud be set or given in query?
          // diff query /users?filter[newUsers]=<limit>
          it('show new users should return 200', async function () {
            const res = await agent
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
            const res = await agent
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
            const res = await agent
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
describe.only('authorizing path for logged \'as me\'', function () {
    let loggedUser, otherUser, dbData, userToken, otherUserToken;

    beforeEach(async function () {
      const data = {
        users: 2, // how many users to make
        verifiedUsers: [0] // which  users to make verified
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser, otherUser] = dbData.users;
      const jwtPayload = {username: loggedUser.username};
      userToken = jwt.sign(jwtPayload, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
      const jwtOtherPayload = {username: otherUser.username};
      otherUserToken = jwt.sign(jwtPayload, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
    });

    afterEach(async function () {
      await dbHandle.clear();
    });

    context('logged in', function () {
      context('the edited user is the logged user', function () {
        // profile fields are givenName, familyName, description, birthday
        //
        it('should update 1 profile field', async function () {
          const res = await agent
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
            .set('Authorization', 'Bearer ' + otherUserToken)
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