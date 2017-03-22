'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const agent = supertest.agent(app);

describe('/messages', function () {

  let dbData,
      loggedUser,
      otherUser,
      unverifiedUser,
      sandbox;

  const nonexistentUser = {
    username: 'nonexistent-user',
    password: 'nonexistent-password'
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers(new Date('1999-09-09'), 'Date');
  });

  afterEach(function () {
    sandbox.restore();
  });

  function beforeEachPopulate(data) {
    // put pre-data into database
    beforeEach(async function () {
      // create data in database
      dbData = await dbHandle.fill(data);
    });

    afterEach(async function () {
      await dbHandle.clear();
    });
  }

  // create a new message
  describe('POST', function () {
    beforeEachPopulate({
      users: 3, // how many users to make
      verifiedUsers: [0, 1] // which  users to make verified
    });

    beforeEach(function () {
      [loggedUser, otherUser, unverifiedUser] = dbData.users;
    });

    let validMessage;

    beforeEach(function () {
      validMessage = {
        data: {
          type: 'messages',
          attributes: {
            body: 'this is a message text'
          },
          relationships: {
            to: {
              data: {
                type: 'users', id: otherUser.username
              }
            }
          }
        }
      };
    });

    context('logged in', function () {

      context('valid data', function () {

        context('existent receiver', function () {

          it('create a message from me to receiver', async function () {
            const response = await agent
              .post('/messages')
              .send(validMessage)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(201)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            // test format of the message
            const message = response.body;

            should(message).have.propertyByPath('data', 'type').eql('messages');
            should(message).have.propertyByPath('data', 'id').String();
            should(message).have.propertyByPath('links', 'self')
              .eql(`${config.url.all}/messages/${message.data.id}`);
            // attributes
            should(message).have.propertyByPath('data', 'attributes')
              .deepEqual({
                body: validMessage.data.attributes.body,
                created: Date.now()
                // TODO notified, read
              });

            // relationships from and to
            should(message).have.propertyByPath('data', 'relationships', 'from')
              .deepEqual({
                data: {
                  type: 'users',
                  id: loggedUser.username
                },
                links: {
                  related: `${config.url.all}/users/${loggedUser.username}`,
                  self: `${config.url.all}/messages/${message.data.id}/relationships/from/${loggedUser.username}`
                }
              });

            should(message).have.propertyByPath('data', 'relationships', 'to')
              .deepEqual({
                data: {
                  type: 'users',
                  id: otherUser.username
                },
                links: {
                  related: `${config.url.all}/users/${otherUser.username}`,
                  self: `${config.url.all}/messages/${message.data.id}/relationships/from/${otherUser.username}`
                }
              });

            // read the message from database and test the saved data
            const messageDb = await models.message.read(message.data.id);

            should(messageDb).have.property('body', validMessage.data.attributes.body);
            should(messageDb.created).equal(Date.now());
            should(messageDb.id).equal(message.data.id);
          });

          it('send a message notification to user after some time');

        }); // end of context existent receiver

        context('nonexistent receiver', function () {

          beforeEach(function () {
            validMessage.data.relationships.to.data.id = nonexistentUser.username;
          });

          it('respond with 404', async () => {
            await agent
              .post('/messages')
              .send(validMessage)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

        }); // end of context nonexistent receiver

      }); // end of context valid data

      context('invalid data', function () {

        it('[empty body] respond with 400', async () => {
          // invalidate the message
          validMessage.data.attributes.body = '';
          await agent
            .post('/messages')
            .send(validMessage)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[body with spaces only] respond with 400', async () => {
          // invalidate the message
          validMessage.data.attributes.body = '   ';
          await agent
            .post('/messages')
            .send(validMessage)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[body with enter only] respond with 400', async () => {
          // invalidate the message
          validMessage.data.attributes.body = '\n\n';
          await agent
            .post('/messages')
            .send(validMessage)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[message too long] respond with 400');

        it('sender is receiver', async () => {
          // invalidate the message
          validMessage.data.relationships.to.data.id = loggedUser.username;
          await agent
            .post('/messages')
            .send(validMessage)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

      }); // end of context invalid data

    }); // end of context logged in

    context('not logged in', function () {

      it('respond with 403', async () => {
        await agent
          .post('/messages')
          .send(validMessage)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

    }); // end of context not logged in

    context('logged unverified', function () {

      it('respond with 403', async () => {
        await agent
          .post('/messages')
          .send(validMessage)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(unverifiedUser.username, unverifiedUser.password)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

    }); // end of context logged unverified

  }); // end of describe POST

  // read messages with a filter
  // fetch threads
  // fetch messages in a single thread
  describe('GET', function () {
    let thirdUser;

    beforeEachPopulate({
      users: 4, // how many users to make
      verifiedUsers: [0, 1, 2], // which  users to make verified
      messages: [
        [0, 1], [1, 0], [0, 1], [0, 1], [1, 0],
        [1, 2], [1, 2]
      ]
    });

    beforeEach(function () {
      [loggedUser, otherUser, thirdUser] = dbData.users;
    });

    context('logged in', function () {

      describe('/messages?filter[threads]', function () {
        it('show 1 or more last messages in my latest threads');
        it('allow pagination');
      });

      describe('/messages?filter[with]=:username', function () {
        context('existent user', function () {
          it('show messages with user :username from newest to oldest', async function () {
            const response = await agent
              .get(`/messages?filter[with]=${otherUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.propertyByPath('data');
            should(response.body).have.propertyByPath('links', 'self')
              .eql(`${config.url.all}/messages?filter[with]=${otherUser.username}`);

            const messages = response.body.data;

            should(messages).have.length(5);

            const [msg0, msg1] = messages;

            testMessage(msg0, dbData.messages[4], dbData.users[1], dbData.users[0]);
            testMessage(msg1, dbData.messages[3], dbData.users[0], dbData.users[1]);
          });

          it('[no messages] show 0 messages', async function () {
            const response = await agent
              .get(`/messages?filter[with]=${thirdUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.propertyByPath('data');
            should(response.body).have.propertyByPath('links', 'self')
              .eql(`${config.url.all}/messages?filter[with]=${thirdUser.username}`);

            const messages = response.body.data;

            should(messages).have.length(0);
          });

          it('allow pagination');
        });

        context('nonexistent user', function () {
          it('respond with 404', async function () {
            await agent
              .get(`/messages?filter[with]=${nonexistentUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });
        });

      });

    });

    context('not logged in', function () {
      it('respond with 403', async function () {
        await agent
          .get(`/messages?filter[with]=${nonexistentUser.username}`)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });

});

describe('/messages/:id', function () {
  describe('PATCH', function () {
    it('edit the message body if i\'m a sender');

    it('update message.read to true if i\'m a receiver');
  });

  describe('DELETE', function () {
    it('TODO delete the message if and only if i\'m a sender');
  });
});

function testMessage(msg, data, from, to) {
  should(msg).have.property('type', 'messages');
  should(msg).have.property('id', data.id);
  should(msg).have.property('attributes').deepEqual({
    body: data.body,
    created: data.created
  });
  should(msg).have.propertyByPath('relationships', 'from', 'data')
    .deepEqual({
      type: 'users',
      id: from.username
    });
  should(msg).have.propertyByPath('relationships', 'to', 'data')
    .deepEqual({
      type: 'users',
      id: to.username
    });
}
