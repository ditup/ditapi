'use strict';

process.env.NODE_ENV = 'test';

const supertest = require('supertest'),
      should = require('should'),
      path = require('path'),
      MailDev = require('maildev'),
      EventEmitter = require('events');

class MailEmitter extends EventEmitter {}
const mailEmitter = new MailEmitter();

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const agent = supertest.agent(app);

describe('/users', function () {
  let maildev;

  // TODO stub maildev
  // set mailer at the beginning
  before(function (done) {
    maildev = new MailDev(config.mailer);

    maildev.listen(function (err) {
      if (err) return done(err);
      return done();
    });
  });

  /**
   * @todo better description
   * mail event (probably to know that the email was sent)
   */
  before(function () {
    maildev.on('new', function (email) {
      mailEmitter.emit('mail', email);
    });
  });

  // unset mailer at the end
  after(function (done) {
    maildev.end(function (err) {
      if(err) return done(err);
      return done();
    });
  });

  // clear database after every test
  afterEach(function () {
    return dbHandle.clear();
  });

  describe('POST', function () {

    context('good data', function () {

      // valid user data
      const user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      // valid user data to POST as JSON API
      const userData = {
        data: {
          type: 'users',
          attributes: user
        }
      };

      // link to the created user
      const selfLink = `${config.url.all}/users/${user.username}`;

      it('should respond properly', async function () {

        const res = await agent
          .post('/users')
          .send(userData)
          .set('Content-Type', 'application/vnd.api+json')
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect('Location', selfLink)
          .expect(201);

        should(res.body).have.property('data');
        const data = res.body.data;
        should(data).have.property('id', user.username);
        should(res.body.links).have.property('self', selfLink);
        should(data.attributes).have.property('username', user.username);
      });

      it('should create a new user', async function () {

        // POST a new user
        const res = await agent
          .post('/users')
          .send(userData)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(201);

        // GET the new user in another request to test its presence
        await agent
          .get(`/users/${res.body.data.id}`)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(200);
      });

      it('should send a verification email', async function () {

        await agent
          .post('/users')
          .send(userData)
          .set('Content-Type', 'application/vnd.api+json')
          .expect(201);

        // wait for the 'mail' event
        await new Promise(function (resolve) {
          mailEmitter.once('mail', function (email) {
            email.should.have.property('from');
            email.from[0].should.have.property('address', 'info@ditup.org');
            email.should.have.property('to');
            email.to[0].should.have.property('address', user.email);
            email.should.have.property('text');
            return resolve();
          });
        });
      });
    });

    it('[bad username] should respond with error', async function () {

      // user data with invalid username
      const user = {
        username: 'test*',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      // the above in JSON API format
      const userData = {
        data: {
          type: 'users',
          attributes: user
        }
      };

      const res = await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      // TODO better, more detailed errors
      res.body.should.have.property('errors');
    });

    it('[existing username] should respond with error', async function () {
      const userData = {
        data: {
          type: 'users',
          attributes: {
            username: 'test',
            password: 'asdfasdf',
            email: 'test@example.com'
          }
        }
      };

      await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(201);

      const res = await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(409); // Conflict

      res.body.should.have.property('errors');
    });

    it('[bad email] should respond with error', async function () {
      const userData = {
        data: {
          type: 'users',
          attributes: {
            username: 'test',
            password: 'asdfasdf',
            email: 'test@example'
          }
        }
      };

      const res = await agent
        .post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      res.body.should.have.property('errors');
    });

    it('[existent email] should respond with error', async function () {
      const user = {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      };

      const userData = {
        data: {
          type: 'users',
          attributes: user
        }
      };

      // the second user has the same email as the user
      const user2 = {
        username: 'test2',
        password: 'asdfasdf',
        email: 'test@example.com' // the same email
      };

      const userData2 = {
        data: {
          type: 'users',
          attributes: user2
        }
      };


      // post the first user
      await agent.post('/users')
        .send(userData)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(201);

      // verify the first user
      await models.user.finalVerifyEmail(user.username);

      // post the 2nd user and test
      const user2Response = await agent
        .post('/users')
        .send(userData2)
        .set('Content-Type', 'application/vnd.api+json')
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(409); // Conflict

      user2Response.body.should.have.property('errors');
    });
  });

  describe('GET', function () {
    describe('show users with given tags', function () {

      let dbData,
          loggedUser;

      // seed the database with users and some named tags to do filtering on
      beforeEach(async function () {
        const data = {
          users: 5,
          verifiedUsers: [0, 1, 2, 3, 4],
          tags: 8,
          userTag: [
            [1, 1, '', 5],
            [1, 2, '', 4],
            [1, 3, '', 2],
            [1, 4, '', 1],
            [2, 0, '', 5],
            [2, 1, '', 5]
          ]
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser] = dbData.users;
      });

      it('show list of users sorted by userTag relevance', async function () {
        const res = await agent
          .get('/users?filter[tag]=tag1,tag2')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(200);

        should(res.body).have.property('data');
        const data = res.body.data;

        should(data).have.length(2);

        should(data).have.propertyByPath(0, 'id').eql('user1');
        should(data).have.propertyByPath(0, 'type').eql('users');
        should(data).have.propertyByPath(0, 'attributes').containEql({
          username: 'user1',
          givenName: '',
          familyName: ''
        });

        should(data).have.propertyByPath(1, 'id').eql('user2');
        should(data).have.propertyByPath(1, 'type').eql('users');
        should(data).have.propertyByPath(1, 'attributes').containEql({
          username: 'user2',
          givenName: '',
          familyName: ''
        });
      });

      it('include user-tag relationships', async function () {
        const res = await agent
          .get('/users?filter[tag]=tag1,tag2')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(200);

        // user with highest tag relevance and her data
        const [firstUser] = res.body.data;
        const [, fuData] = dbData.users;
        should(firstUser).have.properties({
          type: 'users',
          id: fuData.username
        });

        // check relationship tags (list of user-tags)
        // relationship tags should have self and related links
        should(firstUser).have.propertyByPath('relationships', 'tags')
          .properties({
            links: {
              self: `${config.url.all}/users/${fuData.username}/relationships/tags`,
              related: `${config.url.all}/users/${fuData.username}/tags`
            }
          });

        // check amount of matched tags
        should(firstUser.relationships.tags.data).have.length(2);

        // the tag with highest relevance of the first user
        const [firstUserTag] = firstUser.relationships.tags.data;
        const [futData] = dbData.userTag;
        should(firstUserTag).deepEqual({
          type: 'user-tags',
          id: `${futData.user.username}--${futData.tag.tagname}`
        });

        should(res.body).have.property('included');

        // include user-tag
        should(res.body.included).containDeep([{
          type: 'user-tags',
          id: `${futData.user.username}--${futData.tag.tagname}`,
          attributes: {
            username: futData.user.username,
            tagname: futData.tag.tagname,
            story: futData.story,
            relevance: futData.relevance
          },
          links: {
            self: `${config.url.all}/users/${futData.user.username}/tags/${futData.tag.tagname}`
          },
          relationships: {
            tag: {
              data: {
                type: 'tags',
                id: futData.tag.tagname
              }
            }
          }
        }]);

        // include tag
        should(res.body.included).containDeep([{
          type: 'tags',
          id: futData.tag.tagname,
          attributes: {
            tagname: futData.tag.tagname,
            description: futData.tag.description
          },
          links: {
            self: `${config.url.all}/tags/${futData.tag.tagname}`
          }
        }]);
      });

      it('limit amount of tags to search by to prevend DoS');
    });

    describe('show users with my tags', function () {
      it('list users sorted by relevance weight');
    });
  });
});
