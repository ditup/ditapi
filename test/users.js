'use strict';

const should = require('should'),
      path = require('path'),
      sinon = require('sinon');

const agentFactory = require('./agent'),
      models = require(path.resolve('./models')),
      config = require(path.resolve('./config')),
      mailer = require(path.resolve('./services/mailer')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

describe('/users', function () {
  let agent,
      sandbox;

  // clear database after every test
  afterEach(function () {
    return dbHandle.clear();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    // check that the mail was sent
    sandbox.stub(mailer, 'general');

    agent = agentFactory();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('POST', function () {

    context('good data', function () {

      // valid user data
      const user = {
        username: 'test',
        password: 'iX.0*&5mlwf+',
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
          .expect(201);

        // GET the new user in another request to test its presence
        await agent
          .get(`/users/${res.body.data.id}`)
          .expect(200);
      });

      it('should send a verification email', async function () {

        await agent
          .post('/users')
          .send(userData)
          .expect(201);

        // check the email
        sinon.assert.calledOnce(mailer.general);

        const email = mailer.general.getCall(0).args[0];

        should(email).have.property('to', '<test@example.com>');
        should(email).have.property('subject', 'email verification for ditup.org');
        should(email).have.property('text').match(new RegExp(`${config.appUrl.all}/verify-email/test/[0-9a-f]{32}`));
        should(email).have.property('html').match(new RegExp(`${config.appUrl.all}/verify-email/test/[0-9a-f]{32}`));
      });
    });

    it('[bad username] should respond with error', async function () {

      // user data with invalid username
      const user = {
        username: 'test*',
        password: 'iX.0*&5mlwf+',
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
            password: 'iX.0*&5mlwf+',
            email: 'test@example.com'
          }
        }
      };

      await agent
        .post('/users')
        .send(userData)
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(201);

      const res = await agent
        .post('/users')
        .send(userData)
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
            password: 'iX.0*&5mlwf+',
            email: 'test@example'
          }
        }
      };

      const res = await agent
        .post('/users')
        .send(userData)
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      res.body.should.have.property('errors');
    });

    it('[bad password] should respond with 400', async function () {
      const userData = {
        data: {
          type: 'users',
          attributes: {
            username: 'test',
            password: 'invalid',
            email: 'test@example.com'
          }
        }
      };

      const res = await agent
        .post('/users')
        .send(userData)
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(400);

      res.body.should.have.property('errors');
    });

    it('[weak password] should respond with 400', async function () {
      const userData = {
        data: {
          type: 'users',
          attributes: {
            username: 'test',
            password: 'weak.password',
            email: 'test@example.com'
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

    it('[password similar to username] should respond with 400', async function () {
      const userData = {
        data: {
          type: 'users',
          attributes: {
            username: 'krui',
            password: 'krui-lkia',
            email: 'test@example.com'
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
        password: 'iX.0*&5mlwf+',
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
        password: 'iX.0*&5mlwf+',
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
        .expect('Content-Type', /^application\/vnd\.api\+json/)
        .expect(201);

      // verify the first user
      await models.user.finalVerifyEmail(user.username);

      // post the 2nd user and test
      const user2Response = await agent
        .post('/users')
        .send(userData2)
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
            [2, 1, '', 5],
            [3, 2, '', 3],
            [4, 2, '', 2]
          ]
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser] = dbData.users;
      });

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        it('show list of users sorted by userTag relevance', async function () {
          const res = await agent
            .get('/users?filter[tag]=tag1,tag2')
            .expect(200);

          should(res.body).have.property('data');
          const data = res.body.data;

          should(data).have.length(4);

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

        it('limit the output', async () => {
          const res = await agent
            .get('/users?filter[tag]=tag1,tag2&page[limit]=3&page[offset]=0')
            .expect(200);

          should(res.body).have.property('data').Array().length(3);
        });

        it('offset the output', async () => {
          const res = await agent
            .get('/users?filter[tag]=tag1,tag2&page[limit]=5&page[offset]=2')
            .expect(200);

          should(res.body).have.property('data').Array().length(2);
          const { data } = res.body;
          should(data[0]).match({
            type: 'users',
            id: 'user3'
          });
        });

        it('include user-tag relationships', async function () {
          const res = await agent
            .get('/users?filter[tag]=tag1,tag2')
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

        context('invalid data', function () {
          it('[invalid tagnames in a list] error 400', async function () {
            const res = await agent
              .get('/users?filter[tag]=t*,11')
              .expect(400);

            should(res.body).have.propertyByPath('errors', '0', 'title')
              .eql('invalid tag[0]');
          });

          it('[too many tags provided] error 400', async () => {
            // query with 11 provided tags (limit 10)
            const res = await agent
              .get('/users?filter[tag]=tag0,tag1,tag2,tag3,tag4,tag5,tag6,tag7,tag8,tag9,tag10')
              .expect(400);

            should(res.body).have.propertyByPath('errors', '0', 'title')
              .eql('invalid tag');

            should(res.body).have.propertyByPath('errors', '0', 'meta')
              .eql('should NOT have more than 10 items');
          });

          it('[no tags provided] error 400', async () => {
            const res = await agent
              .get('/users?filter[tag]=')
              .expect(400);

            should(res.body).have.propertyByPath('errors', '0', 'title')
              .eql('invalid tag');
            should(res.body).have.propertyByPath('errors', '0', 'meta')
              .eql('should NOT have less than 1 items');
          });

          it('[too high query.page[limit]] error 400', async () => {
            const res = await agent
              .get('/users?filter[tag]=tag1&page[offset]=0&page[limit]=21')
              .expect(400);

            should(res.body).have.propertyByPath('errors', '0', 'title')
              .eql('invalid limit');
            should(res.body).have.propertyByPath('errors', '0', 'meta')
              .eql('should be <= 20');
          });
        });

      });

      context('not logged', () => {
        it('403', async function () {
          await agent
            .get('/users?filter[tag]=tag1,tag2')
            .expect(403);
        });
      });

    });

    describe('show users with my tags', function () {

      let dbData,
          loggedUser;

      // seed the database with users and some named tags to do filtering on
      beforeEach(async function () {
        const data = {
          users: 5,
          verifiedUsers: [0, 1, 2, 3, 4],
          tags: 8,
          userTag: [
            // my tags
            [0, 0, '', 5],
            [0, 1, '', 5],
            [0, 2, '', 4],
            [0, 3, '', 3],
            [0, 4, '', 2],
            [0, 5, '', 1],
            // first user's tags
            [1, 0, '', 5],
            [1, 1, '', 4],
            [1, 2, '', 2],
            [1, 3, '', 1],
            // second user's tags
            [2, 0, '', 1],
            [2, 2, '', 2],
            [2, 4, '', 3],
            [2, 6, '', 4],
            [2, 7, '', 5],
            // third user's tags
            [3, 3, '', 1],
            [3, 4, '', 4],
            [3, 5, '', 1],
            // fourth user's tags don't fit
            [4, 6, '', 5],
            [4, 7, '', 5],
          ]
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser] = dbData.users;
      });

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        it('list users sorted by relevance weight', async function () {
          const res = await agent
            .get('/users?filter[byMyTags]')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const data = res.body.data;

          should(data).have.length(3);

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
            .get('/users?filter[byMyTags]')
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
          should(firstUser.relationships.tags.data).have.length(4);

          // the tag with highest relevance of the first user
          const [firstUserTag] = firstUser.relationships.tags.data;
          const futData = dbData.userTag[6];
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

        it('limit the output', async () => {
          const res = await agent
            .get('/users?filter[byMyTags]&page[offset]=0&page[limit]=2')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const data = res.body.data;

          should(data).have.length(2);

        });

        it('offset the output', async () => {
          const res = await agent
            .get('/users?filter[byMyTags]&page[offset]=2&page[limit]=5')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data').Array().length(1);

          should(res.body.data[0]).match({
            type: 'users',
            id: 'user3'
          });

        });

        it('[invalid query.filter.byMyTags] should fail with 400', async () => {
          await agent
            .get('/users?filter[byMyTags]=asdf')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });

        it('[too high query.page[limit]] error 400', async () => {
          const res = await agent
            .get('/users?filter[byMyTags]&page[offset]=0&page[limit]=21')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
          should(res.body).have.propertyByPath('errors', '0', 'title')
            .eql('invalid limit');
          should(res.body).have.propertyByPath('errors', '0', 'meta')
            .eql('should be <= 20');
        });
      });

      context('not logged', () => {
        it('403', async function () {
          await agent
            .get('/users?filter[byMyTags]')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(403);
        });
      });
    });

    describe('show new users', function () {
      let dbData,
          loggedUser;

      // seed the database with users
      beforeEach(async function () {
        const data = {
          users: 10,
          verifiedUsers: [0, 1, 2, 4, 5, 6, 9]
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser] = dbData.users;
      });

      context('logged in', function () {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', function () {

          function testUser(jsonApiUser, { username }) {
            should(jsonApiUser).have.property('id', username);
          }
          // TODO limit shoud be set or given in query?
          // diff query /users?filter[newUsers]=<limit>
          it('[example 1] show list of 5 newly created and verified users sorted by creation date', async function () {
            const res = await agent
              .get('/users?sort=-created&page[offset]=0&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(200);
            should(res.body).have.property('data').Array().length(5);

            const [user1, user2, user3, user4, user5] = res.body.data;
            testUser(user1, { username: 'user9'});
            testUser(user2, { username: 'user6'});
            testUser(user3, { username: 'user5'});
            testUser(user4, { username: 'user4'});
            testUser(user5, { username: 'user2'});
          });

          it('[example 2] show list of 20 newly created and verified users sorted by creation date', async function () {
            const res = await agent
              .get('/users?sort=-created&page[offset]=0&page[limit]=20')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(200);
            should(res.body).have.property('data').Array().length(7);

            const [user1, user2, user3, user4, user5, user6, user7] = res.body.data;
            testUser(user1, { username: 'user9'});
            testUser(user2, { username: 'user6'});
            testUser(user3, { username: 'user5'});
            testUser(user4, { username: 'user4'});
            testUser(user5, { username: 'user2'});
            testUser(user6, { username: 'user1'});
            testUser(user7, { username: 'user0'});
          });

          it('[example 3] show list of 0 newly created and verified users', async function () {
            const res = await agent
              .get('/users?sort=-created&page[offset]=0&page[limit]=0')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(200);
            should(res.body).have.property('data').Array().length(0);

          });
        });

        context('invalid data', function() {
          // TODO reaction for this data
          it('[limit] data is a string: respond by error 400', async function() {
            await agent
              .get('/users?sort=-created&page[offset]=0&page[limit]=str')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);

          });

          it('[lack of limit data in the query] error 400', async function() {
            await agent
              .get('/users?sort=-created&page[offset]=0&page[limit]=')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);

          });

          it('[lack of \'page.offset\' parameter in the query] error 404', async function() {
            await agent
              .get('/users?sort=-created&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);

          });

          it('[lack of \'pagination\' parameter in the query] error 404', async function() {
            await agent
              .get('/users?sort=-created')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);

          });
          // TODO 400 or 404
          it('[additional \'includes\' parameter in the query] error 404', async function() {
            await agent
              .get('/users?sort=-created&includes=true&page[offset]=0&page[limit]=0')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);

          });

          it('[too high query.page[limit]] error 400', async () => {
            const res = await agent
              .get('/users?sort=-created&page[offset]=0&page[limit]=21')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);
            should(res.body).have.propertyByPath('errors', '0', 'title')
              .eql('invalid limit');
            should(res.body).have.propertyByPath('errors', '0', 'meta')
              .eql('should be <= 20');
          });
        });
      });

      context('not logged in', function () {
        it('error 403', async function() {
          await agent
            .get('/users?sort=-created&page[offset]=0&page[limit]=20')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(403);
        });
      });
    });

    describe('show new users with my tags', function () {
      let dbData,
          loggedUser;

      // seed the database with users and some named tags to do filtering on
      beforeEach(async function () {
        const data = {
          users: 12,
          verifiedUsers: [0, 2, 3, 4, 6, 7, 8, 10, 11],
          tags: 8,
          userTag: [
            // my tags
            [0, 0, '', 5],
            [0, 1, '', 5],
            [0, 2, '', 4],
            [0, 3, '', 3],
            [0, 4, '', 2],
            [0, 5, '', 1],
            // first user's tags
            [1, 0, '', 5],
            [1, 1, '', 4],
            [1, 2, '', 2],
            [1, 3, '', 1],
            // second user's tags
            [2, 0, '', 1],
            [2, 2, '', 2],
            [2, 4, '', 3],
            [2, 6, '', 4],
            [2, 7, '', 5],
            // third user's tags
            [3, 3, '', 1],
            [3, 4, '', 4],
            [3, 5, '', 1],
            // fourth user's tags don't fit
            [4, 6, '', 5],
            [4, 7, '', 5],
            // fifth user's tags (one tag in common)
            [5, 1, '', 3],
            // sixth user's tags (one tag in common)
            [6, 4, '', 4],
            [6, 6, '', 1],
            [6, 7, '', 2],
            // seventh user's tags
            [7, 2, '', 4],
            [7, 3, '', 3],
            [7, 4, '', 2],
            [7, 5, '', 1],
            // eight user's tags don't fit
            [8, 6, '', 5],
            [8, 7, '', 5],
            // nineth user's tags
            [9, 0, '', 5],
            [9, 1, '', 5],
            [9, 2, '', 4],
            [9, 3, '', 3],
            [9, 4, '', 2],
            [9, 5, '', 1],
            // tenth user's tags
            [10, 2, '', 4],
            [10, 3, '', 3],
            [10, 4, '', 2],
            [10, 5, '', 1],
            // eleventh user's tags
            [11, 2, '', 1],
            [11, 4, '', 1],
          ]
        };

        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser] = dbData.users;
      });

      function testUser(jsonApiUser, { username }, tagCount) {
        should(jsonApiUser).have.property('id', username);
        if (typeof(tagCount) === 'number') {
          should(jsonApiUser.relationships.tags.data).length(tagCount);
        }
      }

      context('logged in', function () {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', function () {

          it('[example 1] show list of 5 new users who share at leats 2 tags with me', async function () {
            const res = await agent
              .get('/users?sort=-created&filter[withMyTags]=2&page[offset]=0&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(200);
            should(res.body).have.property('data').Array().length(5);

            const [user1, user2, user3, user4, user5] = res.body.data;
            testUser(user1, { username: 'user11'}, 2);
            testUser(user2, { username: 'user10'}, 4);
            testUser(user3, { username: 'user7'}, 4);
            testUser(user4, { username: 'user3'}, 3);
            testUser(user5, { username: 'user2'}, 3);
          });

          it('[example 2] show list of 5 new users who share at leats 10 tags with me', async function () {
            const res = await agent
              .get('/users?sort=-created&filter[withMyTags]=10&page[offset]=0&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(200);
            should(res.body).have.property('data').Array().length(0);
          });

          it('[example 3] show list of 2 new users who share at leats 3 tags with me', async function () {
            const res = await agent
              .get('/users?sort=-created&filter[withMyTags]=3&page[offset]=0&page[limit]=2')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(200);
            should(res.body).have.property('data').Array().length(2);

            const [user1, user2] = res.body.data;
            testUser(user1, { username: 'user10' }, 4);
            testUser(user2, { username: 'user7' }, 4);
          });

          it('[example 4] show list of 20 new users who share at leats 1 tags with me', async function () {
            const res = await agent
              .get('/users?sort=-created&filter[withMyTags]=1&page[offset]=0&page[limit]=20')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(200);
            should(res.body).have.property('data').Array().length(6);

            const [ user1, user2, user3, user4, user5, user6 ] = res.body.data;
            testUser(user1, { username: 'user11'}, 2);
            testUser(user2, { username: 'user10'}, 4);
            testUser(user3, { username: 'user7'}, 4);
            testUser(user4, { username: 'user6'}, 1);
            testUser(user5, { username: 'user3'}, 3);
            testUser(user6, { username: 'user2'}, 3);
          });
        });

        context('invalid data', function() {

          it('[invalid \'shareMyTags\' parameter] error 400', async function () {
            await agent
              .get('/users?sort=-created&filter[withMyTags]=2&fpage[offset]=0&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);
          });

          it('[invalid \'page.offset\' parameter] parameter is not a number: error 400', async function () {
            await agent
              .get('/users?sort=-created&filter[withMyTags]=2&page[offset]=text&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);
          });

          it('[lack of \'sort\' parameter] error 404', async function () {
            await agent
              .get('/users?filter[withMyTags]=2&page[offset]=0&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(404);
          });

          it('[lack of \'page.offset\' parameter] error 400', async function () {
            await agent
              .get('/users?sort=-created&filter[withMyTags]=2&page[limit]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);
          });

          it('[additional \'page.size\' parameter] error 400', async function () {
            await agent
              .get('/users?sort=-created&filter[withMyTags]=2&page[offset]=0&page[limit]=5&page[size]=5')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);
          });

          it('[too high query.page[limit]] error 400', async () => {
            const res = await agent
              .get('/users?sort=-created&filter[withMyTags]=2&page[offset]=0&page[limit]=21')
              .expect('Content-Type', /^application\/vnd\.api\+json/)
              .expect(400);
            should(res.body).have.propertyByPath('errors', '0', 'title')
              .eql('invalid limit');
            should(res.body).have.propertyByPath('errors', '0', 'meta')
              .eql('should be <= 20');
          });
        });
      });

      context('not logged in', function () {

        it('error 403', async function () {
          await agent
            .get('/users?sort=-created&filter[withMyTags]=2&page[offset]=0&page[limit]=5')
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(403);
        });

      });
    });
  });
});
