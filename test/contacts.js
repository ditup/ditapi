'use strict';

const path = require('path'),
      should = require('should'),
      sinon = require('sinon');

const agentFactory = require('./agent'),
      config = require(path.resolve('./config')),
      dbHandle = require(path.resolve('./test/handle-database')),
      models = require(path.resolve('./models')),
      notificationJobs = require(path.resolve('./jobs/notifications'));

// to stub the mailer
const mailer = require(path.resolve('./services/mailer'));

describe('contacts', function () {
  let agent,
      dbData,
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

    agent = agentFactory();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('POST /contacts', function () {
    beforeEach(async function () {
      // create data in database
      dbData = await dbHandle.fill({
        users: 4,
        verifiedUsers: [0, 1, 2]
      });
    });

    let contactBody;

    function checkEmail(email, from, to, message) {
      should(email).have.property('to', `<${to.email}>`);
      should(email).have.property('subject', `${from.username} would like to create a contact with you on ditup`);

      const url = `${config.appUrl.all}/contact-with/${from.username}`;
      should(email).have.property('text').match(new RegExp(`${to.username}(.|\\n)*${from.username}(.|\\n)*${url}(.|\\n)*${message.text}`));
      should(email).have.property('html').match(new RegExp(`${to.username}(.|\\n)*${from.username}(.|\\n)*${url}(.|\\n)*${message.html}`));
    }

    function generateContactBody(to, { trust = 1, reference = 'default reference', message = 'default message' } = { }) {

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

      beforeEach(() => {
        const [loggedUser] = dbData.users;
        agent = agentFactory.logged(loggedUser);
      });

      context('valid data', function () {
        it('create a contact to a user', async function () {
          const [me, other] = dbData.users;

          const response = await agent
            .post('/contacts')
            .send(contactBody)
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
              isConfirmed: false
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
          const [, user1, user2] = dbData.users;

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
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('send one email informing the target user (asking for confirmation)', async function () {
          const [me, other] = dbData.users;

          const message = 'i know you, i would like to establish a <a href="https://example.com" target="_blank">contact</a> with you';

          await models.contact.create({
            from: me.username,
            to: other.username,
            trust: 2,
            reference: 'the reference text',
            message
          });

          await notificationJobs.contactRequests();

          sandbox.clock.tick(100);
          // second time the mail should not be sent
          await notificationJobs.contactRequests();

          sinon.assert.calledOnce(mailer.general);

          const email = mailer.general.getCall(0).args[0];

          checkEmail(email, me, other, {
            text: 'i know you, i would like to establish a contact with you',
            html: 'i know you, i would like to establish a <a href="https:\\/\\/example\\.com">contact<\\/a> with you'
          });

        });
      });

      context('invalid data', function () {

        it('[sending contact to unverified user] error 404', async () => {
          const unverified = dbData.users[3];
          const contactBody = generateContactBody(unverified);

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[missing attribute \'trust\' in request body] 400', async function () {
          const [, other] = dbData.users;

          const contactBody = generateContactBody(other, {});
          delete contactBody.data.attributes.trust;

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[invalid attributes] 400', async function () {
          const [, other] = dbData.users;

          const contactBody = generateContactBody(other, {});
          contactBody.data.attributes.invalid = 'invalid';

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[invalid other username] error 400', async function () {
          const contactBody = generateContactBody({ username: 'invalid username' }, {});

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[invalid trust level] error 400', async function () {
          const [, other] = dbData.users;

          const contactBody = generateContactBody(other, { trust: 7 });

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

        });

        it('[invalid message] 400', async function () {
          const [, other] = dbData.users;

          const contactBody = generateContactBody(other, { message: '.'.repeat(2049)});

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

        });

        it('[invalid reference] 400', async function () {
          const [, other] = dbData.users;

          const contactBody = generateContactBody(other, { reference: '.'.repeat(2049)});

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

        });

        it('[contact to oneself] 400', async function () {
          const [me] = dbData.users;

          await agent
            .post('/contacts')
            .send(generateContactBody(me, {}))
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[nonexistent other user] error 404 and info', async function () {
          const response = await agent
            .post('/contacts')
            .send(generateContactBody({ username: 'nonexistent-user' }, {}))
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', '0', 'meta').eql('some users not found');

        });

        it('[already existent] 409 Conflict', async function () {
          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          await agent
            .post('/contacts')
            .send(contactBody)
            .expect(409)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[opposite direction exists] 409 Conflict', async function (){
          const [me, other] = dbData.users;

          await agentFactory.logged(me)
            .post('/contacts')
            .send(contactBody)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          contactBody.data.relationships.to.data.id = me.username;

          await agentFactory.logged(other)
            .post('/contacts')
            .send(contactBody)
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
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });

  describe('PATCH /contacts/:from/:to', function () {
    // confirming the contact
    describe('confirming the contact', function () {

      beforeEach(async function () {
        // create data in database
        dbData = await dbHandle.fill({
          users: 4,
          verifiedUsers: [0, 1, 2, 3],
          contacts: [
            [0, 1, { isConfirmed: false }],
            [2, 0, { isConfirmed: false }],
            [3, 0, { isConfirmed: true }]
          ]
        });
      });

      context('logged in', function () {

        beforeEach(() => {
          const [loggedUser] = dbData.users;
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', function () {

          it('makes the contact confirmed and saves trust & reference', async function () {
            const [other, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            const dbContact = await models.contact.read(me.username, other.username);
            should(dbContact).have.property('isConfirmed', true);
            should(dbContact).have.property('confirmed', Date.now());
            should(dbContact).have.property('trust', 4);
            should(dbContact).have.property('reference', 'other reference');
          });

          it('returns the updated contact', async () => {
            const [other, me] = dbData.users;

            const response = await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(200);

            should(response.body).containDeep({
              data: {
                type: 'contacts',
                id: `${me.username}--${other.username}`,
                attributes: {
                  isConfirmed: true,
                  trust: 4,
                  reference: 'other reference'
                }
              }
            });
          });

          it('TODO maybe notifications? (not email, just info on login)');
        });

        context('invalid data', function () {
          it('[nonexistent contact to confirm] 404 and info', async function () {
            const [, me, another] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${another.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${another.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[already confirmed contact to confirm] 403', async function () {
            const [me,,, other] = dbData.users;

            // default logged agent
            await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(403)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[nonexistent user] 404', async function () {
            const [me] = dbData.users;

            // default logged agent
            await agent
              .patch(`/contacts/${me.username}/nonexistent-user`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--nonexistent-user`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[url params and id don\'t match] 400', async function () {
            const [me, other, another] = dbData.users;

            // default logged agent
            await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${another.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[missing parameters (confirmed, trust, reference)] 400', async function () {
            const [other, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    reference: 'other reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[unexpected (invalid) parameters] 400', async function () {
            const [other, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference',
                    message: 'invalid'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[invalid reference] 400', async function () {
            const [other, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: '.'.repeat(2049)
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[invalid trust] 400', async function () {
            const [other, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 3,
                    reference: 'some reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[invalid username] 400', async function () {
            const [, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/invalid..username`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--invalid..username`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'some reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[body.isConfirmed!=true] 400', async function () {
            const [other, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: false,
                    trust: 4,
                    reference: 'some reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[the same user who created confirms] 404', async function () {
            const [me, other] = dbData.users;

            // default logged agent
            await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[confirming contact not directed to me] 403', async function () {
            const [other, me, another] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${other.username}/${another.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${other.username}--${another.username}`,
                  attributes: {
                    isConfirmed: true,
                    trust: 4,
                    reference: 'other reference'
                  }
                }
              })
              .expect(403)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });
        });
      });

      context('not logged in', function () {
        it('403', async function () {
          const [other, me] = dbData.users;
          await agent
            .patch(`/contacts/${me.username}/${other.username}`)
            .send({
              data: {
                type: 'contacts',
                id: `${me.username}--${other.username}`,
                attributes: {
                  isConfirmed: true,
                  trust: 4,
                  reference: 'other reference'
                }
              }
            })
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    // updating the reference and level of trust (1,2,4,8)
    describe('updating the contact', function () {

      beforeEach(async function () {
        // create data in database
        dbData = await dbHandle.fill({
          users: 4,
          verifiedUsers: [0, 1, 2],
          contacts: [
            [0, 1, { isConfirmed: true }],
            [0, 2, { isConfirmed: false }]
          ]
        });
      });

      context('logged in', function () {

        beforeEach(() => {
          const [me] = dbData.users;
          agent = agentFactory.logged(me);
        });

        context('good data provided', function () {
          it('200 & update & respond with the updated contact', async function () {
            const [me, other] = dbData.users;

            const resp = await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    trust: 4,
                    reference: 'changed reference'
                  }
                }
              })
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            const dbContact = await models.contact.read(me.username, other.username);
            should(dbContact).have.property('trust', 4);
            should(dbContact).have.property('reference', 'changed reference');

            should(resp).have.propertyByPath('body', 'data', 'id').eql(`${me.username}--${other.username}`);
            should(resp).have.propertyByPath('body', 'data', 'attributes').match({
              trust: 4,
              reference: 'changed reference'
            });
          });

          it('[opposite direction] 200 & update & respond with the updated contact', async function () {
            const [other, me] = dbData.users;

            const resp = await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    trust: 4,
                    reference: 'updated reference'
                  }
                }
              })
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            const dbContact = await models.contact.read(me.username, other.username);
            should(dbContact).have.property('trust', 4);
            should(dbContact).have.property('reference', 'updated reference');

            should(resp).have.propertyByPath('body', 'data', 'id').eql(`${me.username}--${other.username}`);
            should(resp).have.propertyByPath('body', 'data', 'attributes').match({
              trust: 4,
              reference: 'updated reference'
            });

          });


          it('[unconfirmed which i created, including message] 200, update, respond', async function () {
            const [me,, other] = dbData.users;

            // default logged agent
            await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    trust: 4,
                    reference: 'updated reference',
                    message: 'updated message'
                  }
                }
              })
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            const dbContact = await models.contact.read(me.username, other.username);
            should(dbContact).have.property('trust', 4);
            should(dbContact).have.property('reference', 'updated reference');
            should(dbContact).have.property('message', 'updated message');
          });

          it('[partial update] 200, update partially, respond', async function () {
            const [me,, other] = dbData.users;

            await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    reference: 'updated reference'
                  }
                }
              })
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            const dbContact = await models.contact.read(me.username, other.username);
            should(dbContact).have.property('trust', dbData.contacts[1].trust01);
            should(dbContact).have.property('reference', 'updated reference');
          });
        });

        context('bad data', function () {
          it('[contact not from me] 400', async function () {
            const [userA, userB, me] = dbData.users;

            await agentFactory.logged(me)
              .patch(`/contacts/${userA.username}/${userB.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${userA.username}--${userB.username}`,
                  attributes: {
                    trust: 4,
                    reference: 'changed reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[contains invalid attributes (other than trust, reference, message)] 400', async function () {
            const [me, other] = dbData.users;

            const resp = await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    trust: 4,
                    reference: 'changed reference',
                    invalid: 'invalid attribute'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp).have.propertyByPath('body', 'errors', 0, 'title').eql('invalid attributes');

          });

          it('[jsonapi id doesn\'t match url] 400', async function () {
            const [me, userA, userB] = dbData.users;

            const resp = await agent
              .patch(`/contacts/${me.username}/${userB.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${userB.username}--${userA.username}`,
                  attributes: {
                    trust: 4,
                    reference: 'changed reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp).have.propertyByPath('body', 'errors', 0, 'title').eql('invalid');
          });

          it('[invalid trust] 400', async function () {
            const [me,, other] = dbData.users;

            const resp = await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    trust: 3.5
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp).have.propertyByPath('body', 'errors', 0, 'title').eql('invalid trust');
          });

          it('[invalid reference] 400', async function () {
            const [me,, other] = dbData.users;

            const resp = await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    reference: '.'.repeat(2049)
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp).have.propertyByPath('body', 'errors', 0, 'title').eql('invalid reference');
          });

          it('[invalid message] 400', async function () {
            const [me,, other] = dbData.users;

            const resp = await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    message: '.'.repeat(2049)
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp).have.propertyByPath('body', 'errors', 0, 'title').eql('invalid message');
          });

          it('[provided message when already confirmed] 400', async function () {
            const [me, other] = dbData.users;

            const resp = await agent
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    message: 'a'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp).have.propertyByPath('body', 'errors', 0, 'meta').eql('you can\'t change a message of a confirmed contact');
          });

          it('[nonexistent contact] 404', async function () {
            const [, me, other] = dbData.users;

            const resp = await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    trust: 1
                  }
                }
              })
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.propertyByPath('errors', 0, 'meta').eql('contact doesn\'t exist');
          });

          it('[updating unconfirmed contact i didn\'t create] 400', async function () {
            const [other,, me] = dbData.users;

            const resp = await agentFactory.logged(me)
              .patch(`/contacts/${me.username}/${other.username}`)
              .send({
                data: {
                  type: 'contacts',
                  id: `${me.username}--${other.username}`,
                  attributes: {
                    trust: 4,
                    reference: 'changed reference'
                  }
                }
              })
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.propertyByPath('errors', 0, 'meta').eql('you can\'t update the contact you didn\'t confirm');
          });
        });
      });

      context('not logged in', function () {
        it('403', async function () {
          const [me, other] = dbData.users;
          await agent
            .patch(`/contacts/${me.username}/${other.username}`)
            .send({
              data: {
                type: 'contacts',
                id: `${me.username}--${other.username}`,
                attributes: {
                  trust: 4,
                  reference: 'changed reference'
                }
              }
            })
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });
  });

  describe('DELETE', function () {
    beforeEach(async function () {
      // create data in database
      dbData = await dbHandle.fill({
        users: 3,
        verifiedUsers: [0, 1, 2],
        contacts: [
          [0, 1, { isConfirmed: false }],
          [2, 0, { isConfirmed: true }],
        ]
      });
    });
    // delete a contact
    /*
     *
     *
     */
    context('owner', function () {
      it('[existent contact] returns 204 and removes the contact from database', async function () {
        const [me, other] = dbData.users;

        await should(models.contact.read(me.username, other.username)).be.fulfilled();
        await agentFactory.logged(me)
          .delete(`/contacts/${other.username}/${me.username}`)
          .expect(204)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        await should(models.contact.read(me.username, other.username)).be.rejectedWith(Error, { code: 404 });
      });

      it('[nonexistent contact] returns 404', async function () {
        const [, me, other] = dbData.users;

        await agentFactory.logged(me)
          .delete(`/contacts/${other.username}/${me.username}`)
          .expect(404)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('not owner', function () {
      it('403', async function () {
        const [userA, userB, me]= dbData.users;

        await agentFactory.logged(me)
          .delete(`/contacts/${userA.username}/${userB.username}`)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('not logged', function () {
      it('403', async function () {
        const [userA, userB]= dbData.users;

        // default not logged agent
        await agent
          .delete(`/contacts/${userA.username}/${userB.username}`)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('invalid username(s)', function () {
      it('400', async function () {
        const [me]= dbData.users;

        await agentFactory.logged(me)
          .delete(`/contacts/${me.username}/invalid..username`)
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

  });
});
