'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      _ = require('lodash'),
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

    sandbox.useFakeTimers({
      now: new Date('2017-07-15'),
      toFake: ['Date']
    });

    sandbox.stub(mailer, 'general');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('GET /contacts', function () {

    beforeEach(async function () {
      // create data in database
      dbData = await dbHandle.fill({
        users: 5,
        verifiedUsers: [0, 1, 2, 3, 4],
        contacts: [
          [0, 1, { isConfirmed: true, trust01: 4 }],
          [2, 0, { isConfirmed: false, trust01: 2 }],
          [4, 0, { isConfirmed: true, trust01: 1 }],
          [1, 2, { isConfirmed: true, trust01: 8 }],
          [1, 3, { isConfirmed: true, trust01: 4 }],
        ]
      });
    });

    context('logged in', function () {
      describe('?filter[from]=username', function () {
        context('everybody', function () {
          it('see only confirmed contacts from username to others (trust & reference which user gave to others)', async function () {
            const [user0,, me] = dbData.users;
            const response = await agent
              .get(`/contacts?filter[from]=${user0.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.property('data');
            const { data } = response.body;

            should(data).have.length(2);

            should(data).matchEach({
              type: 'contacts',
              relationships: {
                from: {
                  data: {
                    type: 'users',
                    id: dbData.users[0].username
                  }
                }
              },
              attributes: {
                isConfirmed: true
              }
            });

            should(data).matchAny({
              type: 'contacts',
              relationships: {
                to: {
                  data: {
                    type: 'users',
                    id: dbData.users[1].username
                  }
                }
              }
            });
          });
        });

        context('me', function () {
          it('see confirmed and unconfirmed contacts from me to others', async function () {
            const [me] = dbData.users;
            const response = await agent
              .get(`/contacts?filter[from]=${me.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.property('data');
            const { data } = response.body;

            should(data).have.length(3);

            should(data).matchEach({
              type: 'contacts',
              relationships: {
                from: {
                  data: {
                    type: 'users',
                    id: dbData.users[0].username
                  }
                }
              }
            });

            should(data).matchAny({
              type: 'contacts',
              attributes: {
                isConfirmed: false,
                trust: null,
                reference: null
              },
              relationships: {
                from: { data: { id: dbData.users[0].username } },
                to: { data: { id: dbData.users[2].username } },
                creator: { data: { type: 'users', id: dbData.users[2].username } }
              }
            });
          });
        });
      });

      describe('?filter[to]=username', function () {
        context('everybody', function () {
          it('see only confirmed contacts with trust & reference given to the user', async function () {
            const [user0,, me] = dbData.users;
            const response = await agent
              .get(`/contacts?filter[to]=${user0.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.property('data');
            const { data } = response.body;

            should(data).have.length(2);

            should(data).matchEach({
              type: 'contacts',
              relationships: {
                to: {
                  data: {
                    type: 'users',
                    id: dbData.users[0].username
                  }
                }
              },
              attributes: {
                isConfirmed: true
              }
            });
          });
        });

        context('me', function () {
          it('see confirmed & unconfirmed contacts with trust & reference given to me', async function () {
            const [me] = dbData.users;
            const response = await agent
              .get(`/contacts?filter[to]=${me.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.property('data');
            const { data } = response.body;

            should(data).have.length(3);

            should(data).matchEach({
              type: 'contacts',
              relationships: {
                to: {
                  data: {
                    type: 'users',
                    id: dbData.users[0].username
                  }
                }
              }
            });

            should(data).matchAny({
              type: 'contacts',
              attributes: {
                isConfirmed: false
              },
              relationships: {
                from: { data: { id: dbData.users[2].username } },
                to: { data: { id: dbData.users[0].username } },
                creator: { data: { type: 'users', id: dbData.users[2].username } }
              }
            });

            // don't leak trust & reference
            const unconfirmed = _.filter(data, contact => !contact.attributes.isConfirmed);
            should(unconfirmed).length(1);

            should(unconfirmed[0]).not.have.propertyByPath('attributes', 'trust');
            should(unconfirmed[0]).not.have.propertyByPath('attributes', 'reference');
          });
        });
      });
    });

    context('not logged in', function () {
      it('403', async function () {
        const [user] = dbData.users;
        await agent
          .get(`/contacts?filter[to]=${user.username}`)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });

  describe('GET /contacts/:from/:to', function () {

    beforeEach(async function () {
      // create data in database
      dbData = await dbHandle.fill({
        users: 3,
        verifiedUsers: [0, 1, 2],
        contacts: [
          [0, 1, { isConfirmed: true, trust01: 4 }],
          [1, 2, {
            isConfirmed: false,
            trust01: 2,
            trust10: 4,
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
            },
            relationships: {
              from: { data: { type: 'users', id: requester.username } },
              to: { data: { type: 'users', id: requested.username } },
              creator: { data: { type: 'users', id: requester.username } }
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
