'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const app = require(path.resolve('./app')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

// to stub the mailer
const mailer = require(path.resolve('./services/mailer'));

const agent = supertest.agent(app);

describe('GET contacts', function () {
  let dbData,
      sandbox;

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

  describe('GET /contacts/:from/:to', function () {

    beforeEach(async function () {
      // create data in database
      dbData = await dbHandle.fill({
        users: 3,
        verifiedUsers: [0, 1, 2],
        contacts: [
          [0, 1, { isConfirmed: true, trust01: 'defined trust 01' }],
          [1, 2, {
            isConfirmed: false,
            trust01: 'unconfirmed trust 01',
            trust10: 'unconfirmed trust 10',
            reference01: 'unconfirmed reference 01',
            reference10: 'unconfirmed reference 10',
            message: 'unconfirmed message'
          }]
        ]
      });
    });
    /* Return a contact between :from and :to including
     * the reference & trust given by :from to :to.
     * Logged users should be able to see only confirmed contacts.
     * The requester should see unconfirmed contact including message
     * The requested should see existence of unconfirmed contact without trust & reference
     */
    context('logged in', function () {
      context('confirmed contact exists', function () {
        it('return a contact between :from and :to including trust & reference', async function () {
          const [userA, userB, me] = dbData.users;
          const response = await agent
            .get(`/contacts/${userA.username}/${userB.username}`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.property('data');
          const data = response.body.data;

          should(data).match({
            type: 'contacts',
            id: `${userA.username}--${userB.username}`,
            attributes: {
              reference: dbData.contacts[0].reference01,
              trust: dbData.contacts[0].trust01,
              created: Date.now(),
              isConfirmed: true,
              confirmed: Date.now()
            }
          });

          should(data).not.have.propertyByPath('attributes', 'message');
        });

        it('[confirmed contact (opposite direction)] return a contact between :from and :to including trust & reference', async function () {
          const [me, other] = dbData.users;
          const response = await agent
            .get(`/contacts/${other.username}/${me.username}`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.property('data');
          const data = response.body.data;

          should(data).match({
            type: 'contacts',
            id: `${other.username}--${me.username}`,
            attributes: {
              reference: dbData.contacts[0].reference10,
              trust: dbData.contacts[0].trust10,
              created: Date.now(),
              isConfirmed: true,
              confirmed: Date.now()
            }
          });

          should(data).not.have.propertyByPath('attributes', 'message');
        });
      });

      context('unconfirmed contact exists', function () {

        it('[requester] see the whole unconfirmed contact including message', async function () {
          const [, requester, requested] = dbData.users;
          const response = await agent
            .get(`/contacts/${requester.username}/${requested.username}`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(requester.username, requester.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.property('data');
          const data = response.body.data;

          should(data).match({
            type: 'contacts',
            id: `${requester.username}--${requested.username}`,
            attributes: {
              reference: dbData.contacts[1].reference01,
              trust: dbData.contacts[1].trust01,
              message: dbData.contacts[1].message,
              created: Date.now(),
              isConfirmed: false
            }
          });
        });

        it('[requested] see contact with message, without trust & reference', async function () {
          const [, requester, requested] = dbData.users;
          const response = await agent
            .get(`/contacts/${requester.username}/${requested.username}`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(requested.username, requested.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.property('data');
          const data = response.body.data;

          should(data).match({
            type: 'contacts',
            id: `${requester.username}--${requested.username}`,
            attributes: {
              message: dbData.contacts[1].message,
              created: Date.now(),
              isConfirmed: false
            }
          });

          should(data).not.have.propertyByPath('attributes', 'reference');
          should(data).not.have.propertyByPath('attributes', 'trust');
        });

        it('[other] 404', async function () {
          const [other, requester, requested] = dbData.users;
          await agent
            .get(`/contacts/${requester.username}/${requested.username}`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(other.username, other.password)
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });

      context('contact doesn\'t exist', function () {
        it('404', async function () {
          const [me,, other] = dbData.users;
          await agent
            .get(`/contacts/${me.username}/${other.username}`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });

      context('invalid username(s)', function () {
        it('400', async function () {
          const [me] = dbData.users;
          await agent
            .get('/contacts/invalid..username/other..invalid..username')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    context('not logged in', function () {
      it('403', async function () {
        const [me, other] = dbData.users;
        await agent
          .get(`/contacts/${other.username}/${me.username}`)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });
});
