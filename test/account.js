'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

// to stub the mailer
const mailer = require(path.resolve('./services/mailer'));

const agent = supertest.agent(app);

describe('/account', function () {

  describe('reset forgotten password', function () {

    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      sandbox.useFakeTimers({
        now: new Date('1999-09-09'),
        toFake: ['Date']
      });
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

        function checkEmail(user, mailerData) {
          should(mailerData).have.property('to', `<${user.email}>`);
          should(mailerData).have.property('subject', 'reset your password for ditup');

          const url = `${config.appUrl.all}/reset-password/${user.username}/[0-9a-f]{32}`;
          should(mailerData).have.property('text').match(new RegExp(`${user.username}(.|\n)*${url}`));
          should(mailerData).have.property('html').match(new RegExp(`${user.username}(.|\n)*${url}`));
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

          should(resp.body).have.propertyByPath('errors', 0, 'title').eql('invalid id');
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

          should(resp.body).have.propertyByPath('errors', 0, 'title')
            .eql('invalid code');
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

          should(resp.body).have.propertyByPath('errors', 0, 'title').eql('invalid password');
        });
      });
    });
  });

  describe('change email', function () {
    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      sandbox.stub(mailer, 'general');

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

    context('logged in', function () {
      context('good data', function () {
        it('save unverified email and send verification message', async function () {
          const [{ username, password }] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: username,
              attributes: {
                email: 'other.email@example.com',
                password
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(username, password)
            .expect(204);

          sinon.assert.calledOnce(mailer.general);

          const email = mailer.general.getCall(0).args[0];

          should(email).have.property('to', '<other.email@example.com>');
          should(email).have.property('subject', 'email verification for ditup.org');
          should(email).have.property('text').match(new RegExp(`${config.appUrl.all}/user/user0/verify-email/[0-9a-f]{32}`));
          should(email).have.property('html').match(new RegExp(`${config.appUrl.all}/user/user0/verify-email/[0-9a-f]{32}`));
        });
      });

      context('bad data', function () {

        it('[invalid email] 400', async function () {
          const [{ username, password }] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: username,
              attributes: {
                email: 'invalid@email',
                password
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(username, password)
            .expect(400);
        });

        it('[missing password] 400', async function () {
          const [{ username, password }] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: username,
              attributes: {
                email: 'other.email@example.com'
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(username, password)
            .expect(400);
        });

        it('[unexpected attributes] 400', async function () {
          const [{ username, password }] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: username,
              attributes: {
                email: 'other.email@example.com',
                password,
                unexpected: 'unexpected'
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(username, password)
            .expect(400);
        });

        it('[invalid password] 400', async function () {
          const [{ username, password }] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: username,
              attributes: {
                email: 'other.email@example.com',
                password: 'invalid'
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(username, password)
            .expect(400);
        });

        it('[wrong password] 403', async function () {
          const [{ username, password }] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: username,
              attributes: {
                email: 'other.email@example.com',
                password: 'wrong password'
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(username, password)
            .expect(403);
        });

        it('[auth.username vs. req.body.id mismatch] 400', async function () {
          const [{ username, password }] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: 'test1',
              attributes: {
                email: 'other.email@example.com',
                password
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(username, password)
            .expect(400);
        });
      });
    });

    context('not logged in', function () {

      it('error 403', async function () {
        const [user0] = dbData.users;

        const patchBody = {
          data: {
            type: 'users',
            id: user0.username,
            attributes: {
              email: 'other.email@example.com'
            }
          }
        };

        await agent
          .patch('/account')
          .send(patchBody)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403);
      });
    });
  });

  describe('verify email', function () {

    let sandbox,
        code;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      sandbox.useFakeTimers({
        now: new Date('1999-09-09'),
        toFake: ['Date']
      });
    });

    afterEach(function () {
      sandbox.restore();
    });

    // before each test we create a new user
    // and assign her verification code to emailVerifyCode
    beforeEach(async function () {
      const { emailVerifyCode } = await models.user.create({
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      });

      code = emailVerifyCode;
    });

    afterEach(async function () {
      await dbHandle.clear();
    });

    context('valid data', function () {

      it('[correct code] should make the user\'s email verified', async function () {

        // we verify the email
        await agent
          .patch('/account')
          .set('Content-Type', 'application/vnd.api+json')
          .send({
            data: {
              type: 'users',
              id: 'test',
              attributes: {
                emailVerificationCode: code
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(200);

        // see whether the user's email is verified now
        const user = await models.user.read('test');

        should(user).have.property('email', 'test@example.com');
        should(user).have.property('account');
        should(user.account).have.property('email', null);
      });
    });

    context('invalid data', function () {

      it('[invalid username] 400', async function () {
        // we verify the email
        const response = await agent
          .patch('/account')
          .set('Content-Type', 'application/vnd.api+json')
          .send({
            data: {
              type: 'users',
              id: 'test invalid',
              attributes: {
                emailVerificationCode: code
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(400);

        should(response.body).have.propertyByPath('errors', 0, 'title')
          .eql('invalid id');

      });

      it('[invalid code] 400', async function () {
        const invalidCode = 'asdf.123de';

        // we verify the email
        const response = await agent
          .patch('/account')
          .set('Content-Type', 'application/vnd.api+json')
          .send({
            data: {
              type: 'users',
              id: 'test',
              attributes: {
                emailVerificationCode: invalidCode
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(400);

        should(response.body).have.propertyByPath('errors', 0, 'title')
          .eql('invalid emailVerificationCode');
      });

      it('[wrong code] should error', async function () {
        const wrongCode = 'a'.repeat(32);

        // we verify the email
        const response = await agent
          .patch('/account')
          .set('Content-Type', 'application/vnd.api+json')
          .send({
            data: {
              type: 'users',
              id: 'test',
              attributes: {
                emailVerificationCode: wrongCode
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(400);

        should(response.body).have.propertyByPath('errors', 0, 'title')
          .eql('invalid code');

        should(response.body).have.propertyByPath('errors', 0, 'detail')
          .eql('code is wrong');

        // see whether the user's email is verified now
        const user = await models.user.read('test');

        user.should.have.property('email', null);
      });

      it('[expired code] should error 400', async function () {
        // let's wait for 2 hours and 1 millisecond
        const twoHours = 2 * 3600 * 1000;
        sandbox.clock.tick(twoHours + 1);

        // try to verify
        const response = await agent
          .patch('/account')
          .set('Content-Type', 'application/vnd.api+json')
          .send({
            data: {
              type: 'users',
              id: 'test',
              attributes: {
                emailVerificationCode: code
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(400);

        should(response.body).have.propertyByPath('errors', 0, 'title')
          .eql('invalid code');

        should(response.body).have.propertyByPath('errors', 0, 'detail')
          .eql('code is expired');
      });

      it('[reused code] should error', async function () {
        // we verify the email
        await agent
          .patch('/account')
          .set('Content-Type', 'application/vnd.api+json')
          .send({
            data: {
              type: 'users',
              id: 'test',
              attributes: {
                emailVerificationCode: code
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(200);

        sandbox.clock.tick(5000);

        const response = await agent
          .patch('/account')
          .set('Content-Type', 'application/vnd.api+json')
          .send({
            data: {
              type: 'users',
              id: 'test',
              attributes: {
                emailVerificationCode: code
              }
            }
          })
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(400);

        should(response.body).have.propertyByPath('errors', 0, 'title')
          .eql('invalid request');

        should(response.body).have.propertyByPath('errors', 0, 'detail')
          .eql('user is already verified');
      });

    });

  });

  describe('change password', function () {
    let dbData;

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
              id: user1.username,
              attributes: {
                oldPassword: user1.password,
                password: 'new-password_?'
              }
            }
          };


          await agent
            .patch('/account')
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

        it('[logged user doesn\'t match request body data.id] error 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: 'username',
              attributes: {
                oldPassword: user0.password,
                password: 'new-password_?'
              }
            }
          };

          await agent
            .patch('/account')
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
              id: user0.username,
              attributes: {
                oldPassword: 'wrongPassword',
                password: 'new-password_?'
              }
            }
          };

          await agent
            .patch('/account')
            .send(patchBody)
            .auth(user0.username, user0.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(403);
        });

        it('[invalid new password] should error with 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
              attributes: {
                oldPassword: user0.password,
                password: 'invalid'
              }
            }
          };

          const response = await agent
            .patch('/account')
            .send(patchBody)
            .auth(user0.username, user0.password)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(400);

          should(response.body).have.propertyByPath('errors', 0, 'title')
            .eql('invalid password');
        });

        it('[unexpected attributes] should error with 400', async function () {
          const [user0] = dbData.users;

          const patchBody = {
            data: {
              type: 'users',
              id: user0.username,
              attributes: {
                oldPassword: user0.password,
                password: 'new-password_?',
                invalidAttribute: 'attribute'
              }
            }
          };


          await agent
            .patch('/account')
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
            id: user0.username,
            attributes: {
              oldPassword: user0.password,
              password: 'new-password_?'
            }
          }
        };

        await agent
          .patch('/account')
          .send(patchBody)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403);
      });
    });


  });

});
