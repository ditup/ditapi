'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      _ = require('lodash'),
      path = require('path');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config')),
      notificationJobs = require(path.resolve('./jobs/notifications')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

// to stub the mailer
const mailer = require(path.resolve('./services/mailer'));

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

        it('[message too long] respond with 400', async () => {
          // invalidate the message
          validMessage.data.attributes.body = _.repeat('*', 2049);
          await agent
            .post('/messages')
            .send(validMessage)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

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

        it('invalid receiver', async () => {
          // invalidate the message
          delete validMessage.data.relationships.to.data.id;
          const response = await agent
            .post('/messages')
            .send(validMessage)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', 0, 'title').eql('invalid attributes');
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

  describe.only('email notifications', function () {

    // create some conversations
    beforeEachPopulate({
      users: 3, // how many users to make
      verifiedUsers: [0, 1, 2], // which  users to make verified
      messages: [
        [0, 1], [1, 0], [0, 1], [0, 1], [1, 0],
        [1, 2], [1, 2], [2, 1]
      ]
    });

    beforeEach(function () {
      // check that the mail was sent
      sandbox.stub(mailer, 'general');
    });

    it('send message notifications about all unnotified and unread messages', async function () {
      // run the job (in reality it will be run every 3 minutes)
      await notificationJobs.messages();

      sinon.assert.callCount(mailer.general, 4);

      // TODO test the text of the messages
    });

    it('don\'t notify already notified messages again', async function () {
      // run the job (in reality it will be run every 3 minutes)
      await notificationJobs.messages();
      // first time it's called 4 times

      sinon.assert.callCount(mailer.general, 4);

      await notificationJobs.messages();


      // second time still just 4 times
      sinon.assert.callCount(mailer.general, 4);

    });
  });

  // read messages with a filter
  // fetch threads
  // fetch messages in a single thread
  describe('GET', function () {
    let thirdUser;

    beforeEachPopulate({
      users: 5, // how many users to make
      verifiedUsers: [0, 1, 2, 3], // which  users to make verified
      messages: [
        [0, 1], [1, 0], [0, 1], [0, 1], [1, 0],
        [1, 2], [1, 2],
        [0, 3], [3, 0], [0, 3]
      ]
    });

    beforeEach(function () {
      [loggedUser, otherUser, thirdUser] = dbData.users;
    });

    context('logged in', function () {

      describe('/messages?filter[count]', function () {
        it('show amount of unread threads in meta', async function () {
          const response = await agent
            .get('/messages?filter[count]')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);


          should(response).have.propertyByPath('body', 'meta', 'unread').equal(2);

        });
      });

      describe('/messages?filter[threads]', function () {
        it('show last messages of my threads sorted by time', async function () {
          const response = await agent
            .get('/messages?filter[threads]')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(otherUser.username, otherUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('data');

          should(response.body).have.propertyByPath('links', 'self')
            .eql(`${config.url.all}/messages?filter[threads]`);

          const threads = response.body.data;

          should(threads).have.length(2);

          const [msg0, msg1] = threads;

          testMessage(msg0, dbData.messages[6], dbData.users[1], dbData.users[2]);
          testMessage(msg1, dbData.messages[4], dbData.users[1], dbData.users[0]);

          // check included users
          should(response.body).have.property('included').length(3);

          const included = response.body.included;

          should(included).containDeep([{
            type: 'users',
            id: dbData.users[0].username
          },
          {
            type: 'users',
            id: dbData.users[1].username
          },
          {
            type: 'users',
            id: dbData.users[2].username
          }]);
        });

        it('allow pagination');

        it('mark received messages as either unread or read', async function () {
          const response = await agent
            .get('/messages?filter[threads]')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response).have.propertyByPath('body', 'data');

          should(response.body.data).have.length(2);

          const [msg0] = response.body.data;

          should(msg0).have.propertyByPath('attributes', 'read').Boolean();
        });

        it('TODO, maybe: don\'t mark sent messages as read or unread');
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

          it('mark received messages as either unread or read', async function () {
            const response = await agent
              .get(`/messages?filter[with]=${otherUser.username}`)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response).have.propertyByPath('body', 'data');

            should(response.body.data).have.length(5);

            const [, msg1] = response.body.data;

            should(msg1).have.propertyByPath('attributes', 'read').Boolean();
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
  let dbData;

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

  describe('PATCH', function () {
    let msgData;

    beforeEach(() => {
      msgData = {
        data: {
          type: 'messages',
          attributes: {
            read: true
          }
        }
      };
    });

    beforeEachPopulate({
      users: 4, // how many users to make
      verifiedUsers: [0, 1, 2], // which  users to make verified
      messages: [
        [0, 1], [1, 0], [0, 1], [0, 1], [1, 0],
        [1, 2], [1, 2]
      ]
    });

    it('edit the message body if i\'m a sender');

    describe('mark messages as read', function () {
      it('update message.read and all the older received messages of the thread to true if i\'m the receiver', async function () {
        const [,, msg2, msg3] = dbData.messages;
        const [, user1] = dbData.users;

        msgData.data.id = msg2.id;

        const resp = await agent
          .patch(`/messages/${msg2.id}`)
          .send(msgData)
          .auth(user1.username, user1.password)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        should(resp.body.data).have.length(2);

        // the second time update the rest of the messages
        //
        msgData.data.id = msg3.id;

        const resp2 = await agent
          .patch(`/messages/${msg3.id}`)
          .send(msgData)
          .auth(user1.username, user1.password)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        should(resp2.body.data).have.length(1);
      });

      // the receiver must match logged user
      // the id in url must match id in body
      // no other attributes than read: true must be present

      it('if i\'m not a receiver, error 403', async function () {
        const [,, msg2] = dbData.messages;
        const [user0] = dbData.users;

        msgData.data.id = msg2.id;

        await agent
          .patch(`/messages/${msg2.id}`)
          .send(msgData)
          .auth(user0.username, user0.password)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('if id in url doesn\'t match id in body, error 400', async function () {
        const [, msg1, msg2] = dbData.messages;
        const [user0] = dbData.users;

        msgData.data.id = msg1.id;

        await agent
          .patch(`/messages/${msg2.id}`)
          .send(msgData)
          .auth(user0.username, user0.password)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('if other attributes than read are present, error 400', async function () {
        const [, msg1] = dbData.messages;
        const [user0] = dbData.users;

        msgData.data.id = msg1.id;

        msgData.data.attributes.body = 'new message text';

        await agent
          .patch(`/messages/${msg1.id}`)
          .send(msgData)
          .auth(user0.username, user0.password)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('if read is not equal true, error with 400', async function () {
        const [, msg1] = dbData.messages;
        const [user0] = dbData.users;

        msgData.data.id = msg1.id;

        msgData.data.attributes.read = '';

        await agent
          .patch(`/messages/${msg1.id}`)
          .send(msgData)
          .auth(user0.username, user0.password)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

  });

  describe('DELETE', function () {
    it('TODO delete the message if and only if i\'m a sender');
  });
});

function testMessage(msg, data, from, to) {
  should(msg).have.property('type', 'messages');
  should(msg).have.property('id', data.id);
  should(msg).have.property('attributes').containEql({
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
