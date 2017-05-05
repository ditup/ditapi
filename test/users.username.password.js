'use strict';

process.env.NODE_ENV = 'test';

const path = require('path'),
      supertest = require('supertest'),
      should = require('should');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const agent = supertest.agent(app);


describe('change password', function () {
  let dbData;

  describe('PATCH /users/:username/account', function () {

    beforeEach(async function () {
      const data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1] // which  users to make verified
      };

      // create data in database
      dbData = await dbHandle.fill(data);
    });

    afterEach(async function () {
      await dbHandle.clear();
    });

    context('authorized', function () {

      context('good data', function () {
        it('should update the password', async function () {
          const [, user1] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user1.id,
              attributes: {
                oldPassword: user1.password,
                password: 'new-password_?'
              }
            }
          };


          await agent
            .patch(`/users/${user1.username}/account`)
            .send(patchBody)
            .auth(user1.username, user1.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(204);

          // check that we can authenticate with the new password
          const { authenticated } = await models.user.authenticate(user1.username, patchBody.data.attributes.password);

          should(authenticated).eql(true);

        });
      });

      context('bad data', function () {
        it('[missing old password] should error with 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.id,
              attributes: {
                password: 'new-password_?'
              }
            }
          };

          await agent
            .patch(`/users/${user0.username}/account`)
            .send(patchBody)
            .auth(user0.username, user0.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);
        });

        it('[wrong old password] should error with 403', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.id,
              attributes: {
                oldPassword: 'wrongPassword',
                password: 'new-password_?'
              }
            }
          };

          await agent
            .patch(`/users/${user0.username}/account`)
            .send(patchBody)
            .auth(user0.username, user0.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(403);
        });

        it('[missing new password] should error with 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.id,
              attributes: {
                oldPassword: user0.password
              }
            }
          };

          await agent
            .patch(`/users/${user0.username}/account`)
            .send(patchBody)
            .auth(user0.username, user0.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);
        });

        it('[invalid new password] should error with 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.id,
              attributes: {
                oldPassword: user0.password,
                password: 'invalid'
              }
            }
          };

          await agent
            .patch(`/users/${user0.username}/account`)
            .send(patchBody)
            .auth(user0.username, user0.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);
        });

        it('[unexpected attributes] should error with 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.id,
              attributes: {
                oldPassword: user0.password,
                password: 'new-password_?',
                invalidAttribute: 'attribute'
              }
            }
          };


          await agent
            .patch(`/users/${user0.username}/account`)
            .send(patchBody)
            .auth(user0.username, user0.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

        });
      });
    });

    context('not authorized', function () {
      it('error 403', async function () {
        const [user0] = dbData.users;

        const patchBody = {
          data: {
            type: 'users',
            id: user0.id,
            attributes: {
              oldPassword: user0.password,
              password: 'new-password_?'
            }
          }
        };

        await agent
          .patch(`/users/${user0.username}/account`)
          .send(patchBody)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403);
      });
    });


  });
});
