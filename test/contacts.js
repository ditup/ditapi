'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config')),
      notificationJobs = require(path.resolve('./jobs/notifications')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

// to stub the mailer
const mailer = require(path.resolve('./services/mailer'));

const agent = supertest.agent(app);

describe('contacts', function () {
  let dbData,
      sandbox;

  beforeEach(async function () {
    // create data in database
    dbData = await dbHandle.fill({
      users: 4,
      verifiedUsers: [0, 1, 2]
    });
  });

  afterEach(async function () {
    await dbHandle.clear();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers(new Date('2017-07-15'), 'Date');

    sandbox.stub(mailer, 'general');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('POST /contacts', function () {
    let contactBody;

    function checkEmail(email, from, to, message) {
      should(email).have.property('email', to.email);
      should(email).have.property('subject', `${from.username} would like to create a contact with you on ditup`);

      const url = `${config.appUrl.all}/user/${to.username}/contact/${from.username}`;
      should(email).have.property('text').match(new RegExp(`^Hello ${to.username},\n\n${from.username} would like to make a contact with you on ditup\. Go to ${url} to confirm or cancel it\.\n\nHere is what ${from.username} wrote to you:\n\n${message}$`, 'm'));
      should(email).have.property('html').match(new RegExp(`^Hello ${to.username},<br><br>\n\n${from.username} would like to make a contact with you on ditup\. Go to ${url} to confirm or cancel it\.<br><br>\n\nHere is what ${from.username} wrote to you:<br><br>\n\n${message}$`, 'm'));
    }

    function generateContactBody(to, { trust, reference, message }) {

      trust = trust || 1;
      reference = reference || 'default reference';
      message = message || 'default message';

      return {
        data: {
          type: 'contacts',
          attributes: { trust, reference, message },
          relationships: {
            to: {
              data: { type: 'users', id: to.username }
            }
          }
        }
      };
    }

    beforeEach(function () {
      const [, other] = dbData.users;
      contactBody = {
        data: {
          type: 'contacts',
          attributes: {
            trust: 2,
            reference: 'we met, she exists',
            message: 'Would you like to make a contact with me?'
          },
          relationships: {
            to: {
              data: { type: 'users', id: other.username }
            }
          }
        }
      };
    });
    // creating a contacta
    // relationship: from: ... to: ...
    // don't create a duplicate contact (both directions)
    // no contact to self can be created
    context('logged in', function () {
      context('valid data', function () {
        it('create a contact to a user', async function () {
          const [me, other] = dbData.users;
          const response = await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);


          // check presence in database
          const contactDB = await models.contact.read(me.username, other.username);
          should(contactDB).Object();

          // check response body
          // test format of the message
          const contact = response.body;

          should(contact).have.propertyByPath('data', 'type').eql('contacts');
          should(contact).have.propertyByPath('data', 'id').String();
          should(contact).have.propertyByPath('links', 'self')
            .eql(`${config.url.all}/contacts/${me.username}/${other.username}`);
          // attributes
          should(contact).have.propertyByPath('data', 'attributes')
            .deepEqual({
              trust: 2,
              reference: 'we met, she exists',
              created: Date.now(),
              confirmed: false
            });

          // relationships from and to
          should(contact).have.propertyByPath('data', 'relationships', 'from')
            .deepEqual({
              data: {
                type: 'users',
                id: me.username
              },
              links: {
                related: `${config.url.all}/users/${me.username}`,
                self: `${config.url.all}/contacts/${me.username}/${other.username}/relationships/from`
              }
            });

          should(contact).have.propertyByPath('data', 'relationships', 'to')
            .deepEqual({
              data: {
                type: 'users',
                id: other.username
              },
              links: {
                related: `${config.url.all}/users/${other.username}`,
                self: `${config.url.all}/contacts/${me.username}/${other.username}/relationships/to`
              }
            });
        });

        it('create multiple contacts between different people', async function () {
          const [me, user1, user2] = dbData.users;

          await agent
            .post('/contacts')
            .send({
              data: {
                type: 'contacts',
                attributes: {
                  trust: 2,
                  reference: 'we met, she exists',
                  message: 'Would you like to make a contact with me?'
                },
                relationships: {
                  to: {
                    data: { type: 'users', id: user1.username }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          await agent
            .post('/contacts')
            .send({
              data: {
                type: 'contacts',
                attributes: {
                  trust: 2,
                  reference: 'we met, she exists',
                  message: 'Would you like to make a contact with me?'
                },
                relationships: {
                  to: {
                    data: { type: 'users', id: user2.username }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('send one email informing the target user (asking for confirmation)', async function () {
          const [me, other] = dbData.users;

          const message = 'i know you, i would like to establish a contact with you';

          await models.contact.create({
            from: me.username,
            to: other.username,
            trust: 2,
            reference: 'the reference text',
            message
          });

          await notificationJobs.contactRequests();

          sinon.assert.calledOnce(mailer.general);

          const email = mailer.general.getCall(0).args[0];

          checkEmail(email, me, other, message);

        });
      });

      context('invalid data', function () {
        it('[missing attribute \'trust\' in request body] 400', async function () {
          const [me, other] = dbData.users;

          const contactBody = generateContactBody(other, {});
          delete contactBody.data.attributes.trust;

          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[invalid attributes] 400', async function () {
          const [me, other] = dbData.users;

          const contactBody = generateContactBody(other, {});
          contactBody.data.attributes.invalid = 'invalid';

          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[invalid other username] error 400', async function () {
          const [me] = dbData.users;

          const contactBody = generateContactBody({ username: 'invalid username' }, {});

          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[invalid trust level] error 400', async function () {
          const [me, other] = dbData.users;

          const contactBody = generateContactBody(other, { trust: 7 });

          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

        });

        it('[invalid reference] 400', async function () {
          const [me, other] = dbData.users;

          const contactBody = generateContactBody(other, { reference: '.'.repeat(2049)});

          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

        });

        it('[contact to oneself], 400', async function () {
          const [me] = dbData.users;

          await agent
            .post('/contacts')
            .send(generateContactBody(me, {}))
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[nonexistent other user] error 404 and info', async function () {
          const [me] = dbData.users;

          const response = await agent
            .post('/contacts')
            .send(generateContactBody({ username: 'nonexistent-user' }, {}))
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', '0', 'meta').eql('some users not found');

        });

        it('[already existent] 409 Conflict', async function () {
          const [me] = dbData.users;
          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(409)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[opposite direction exists] 409 Conflict', async function (){
          const [me, other] = dbData.users;
          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          contactBody.data.relationships.to.data.id = me.username;
          await agent
            .post('/contacts')
            .send(contactBody)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(other.username, other.password)
            .expect(409)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    context('not logged in', function () {
      it('error 403', async function (){
        await agent
          .post('/contacts')
          .send(contactBody)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

      });
    });
  });

  describe('PATCH /contacts', function () {
    // confirming the contact
    it('todo');
    // updating the reference and level of trust (1,2,4,8)
    it('todo');
  });

  describe('GET', function () {
    // read the contacts of a user
    //
    // give both directions of contact
    // read info of one user
    it('todo');
  });

  describe('DELETE', function () {
    // delete a contact
    it('todo');
  });
});
