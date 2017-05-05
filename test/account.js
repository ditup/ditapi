'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

// to stub the mailer
const mailer = require(path.resolve('./services/mailer'));

const agent = supertest.agent(app);

describe('/account', function () {

  describe('reset forgotten password', function () {

    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      sandbox.useFakeTimers(new Date('1999-09-09'), 'Date');
    });

    afterEach(function () {
      sandbox.restore();
    });

    beforeEach(async function () {
      const data = {
        users: 2, // how many users to make
        verifiedUsers: [0] // which  users to make verified
      };

      // create data in database
      dbData = await dbHandle.fill(data);
    });

    afterEach(async function () {
      await dbHandle.clear();
    });

    let dbData,
        sandbox;

    describe('send email with reset code: PATCH /account?reset-password', function () {
      beforeEach(function () {
        // check that the mail was sent
        sandbox.stub(mailer, 'general');
      });

      context('good data', function () {

        function checkEmail(user, email) {
          should(email).have.property('email', user.email);
          should(email).have.property('subject', 'reset your password for ditup');

          const url = `https://ditup.org/reset-password/${user.username}/[0-9a-f]{32}`;
          should(email).have.property('text').match(new RegExp(`^Hello ${user.username},\nsomeone requested to reset your password\.\nIf it was you, please follow this link to finish the process:\n${url}\nThe link is valid for 30 minutes\.\nOtherwise kindly ignore this email, please\.$`, 'm'));
          should(email).have.property('html').match(new RegExp(`^Hello ${user.username},<br>\nsomeone requested to reset your password\.<br>\nIf it was you, please follow this link to finish the process:<br>\n<a href="${url}">${url}</a><br>\nThe link is valid for 30 minutes\.<br>\nOtherwise kindly ignore this email, please\.$`, 'm'));
        }

        it('[username provided] should send an email with reset code (a link) & respond 204', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
            }
          };

          await agent
            .patch('/account?reset-password')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(204);

          sinon.assert.calledOnce(mailer.general);

          const email = mailer.general.getCall(0).args[0];

          checkEmail(user0, email);
        });


        it('[email provided] should send an email with reset code (a link) & respond 204', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.email,
            }
          };

          await agent
            .patch('/account?reset-password')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(204);

          sinon.assert.calledOnce(mailer.general);

          const email = mailer.general.getCall(0).args[0];

          checkEmail(user0, email);
        });

      });

      context('bad data', function () {
        it('[id of user (request body) is not a valid username or email] respond 400', async function () {

          const patchBody = {
            data: {
              type: 'users',
              id: 'in valid',
            }
          };

          await agent
            .patch('/account?reset-password')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);
        });

        it('[invalid request body attributes] respond 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.email,
              attributes: {
                invalid: 'invalid'
              }
            }
          };

          await agent
            .patch('/account?reset-password')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);
        });

        it('[nonexistent username or email] respond 204 (protect against testing email existence)', async function () {

          const patchBody = {
            data: {
              type: 'users',
              id: 'nonexistent',
            }
          };

          await agent
            .patch('/account?reset-password')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(204);
        });

        it('[unverified user] respond 400', async function () {
          const [, user1] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user1.username,
            }
          };

          await agent
            .patch('/account?reset-password')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);
        });
      });
    });

    describe('update password PATCH /account (with password & code)', function () {
      context('good data', function () {
        it('update password, invalidate reset code and respond with 204', async function () {
          const [user0] = dbData.users;

          // first get the validation code
          const { code } = await models.user.createPasswordResetCode(user0.username);
          sandbox.clock.tick(1799999);

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
              attributes: {
                password: 'new-Pa5sw0rD',
                code
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(204);

          // check that we can authenticate with the new password
          const { authenticated } = await models.user.authenticate(user0.username, patchBody.data.attributes.password);

          should(authenticated).eql(true);

          // TODO check that the reset code is invalidated
          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);
        });
      });

      context('bad data', function () {
        it('[invalid username] 400', async function () {
          const [user0] = dbData.users;

          // first get the validation code
          const { code } = await models.user.createPasswordResetCode(user0.username);
          sandbox.clock.tick(1799999);

          const patchBody = {
            data: {
              type: 'users',
              id: 'invalid username',
              attributes: {
                password: 'new-Pa5sw0rD',
                code
              }
            }
          };

          const resp = await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

          should(resp.body).have.propertyByPath('errors', 0, 'meta', 'value').eql('invalid username');
        });

        it('[nonexistent username] 404', async function () {
          const [user0] = dbData.users;

          // first get the validation code
          const { code } = await models.user.createPasswordResetCode(user0.username);
          sandbox.clock.tick(1799999);

          const patchBody = {
            data: {
              type: 'users',
              id: 'nonexistent-username',
              attributes: {
                password: 'new-Pa5sw0rD',
                code
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(404);
        });

        it('[invalid code] 400', async function () {
          const [user0] = dbData.users;

          // first get the validation code
          await models.user.createPasswordResetCode(user0.username);

          sandbox.clock.tick(1799999);

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
              attributes: {
                password: 'new-Pa5sw0rD',
                code: 'invalid'
              }
            }
          };

          const resp = await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

          should(resp.body).have.propertyByPath('errors', 0, 'meta', 'msg').eql('Invalid code');
        });

        it('[wrong code] 400', async function () {
          const [user0] = dbData.users;

          // first create the validation code
          await models.user.createPasswordResetCode(user0.username);

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
              attributes: {
                password: 'new-Pa5sw0rD',
                code: Array(32).fill('f').join('')
              }
            }
          };

          const resp = await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

          should(resp.body).have.propertyByPath('errors', 0, 'meta').eql('Wrong code');
        });

        it('[too old code] 400', async function () {
          const [user0] = dbData.users;

          // first get the validation code
          const { code } = await models.user.createPasswordResetCode(user0.username);
          sandbox.clock.tick(1800001);

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
              attributes: {
                password: 'new-Pa5sw0rD',
                code
              }
            }
          };

          const resp = await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

          should(resp.body).have.propertyByPath('errors', 0, 'meta').eql('Expired code');
        });

        it('[invalid password] 400', async function () {
          const [user0] = dbData.users;

          // first get the validation code
          const { code } = await models.user.createPasswordResetCode(user0.username);
          sandbox.clock.tick(1799999);

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
              attributes: {
                password: 'invalid',
                code
              }
            }
          };

          const resp = await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

          should(resp.body).have.propertyByPath('errors', 0, 'meta', 'msg').eql('Password should be 8-512 characters long');
        });
      });
    });
  });
});
