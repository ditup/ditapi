'use strict';

// @TODO MIGRATE TO USER-TAGS

const supertest = require('supertest'),
      should = require('should'),
      path = require('path');

let app = require(path.resolve('./app')),
    serializers = require(path.resolve('./serializers')),
    models = require(path.resolve('./models')),
    dbHandle = require(path.resolve('./test/handleDatabase')),
    config = require(path.resolve('./config/config'));

let serialize = serializers.serialize;

let agent = supertest.agent(app);

describe('Tags of user', function () {
  let dbData,
      loggedUser,
      otherUser;

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

  describe('/users/:username/tags', function () {
    describe('GET', function () {
      let loggedUser, taggedUser;

      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 8,
        userTag: [
          [1, 0, 'story', 3],
          [1, 1, 'story', 1],
          [1, 3, 'story', 2],
          [1, 4, 'story', 5],
          [1, 5, 'story', 5],
        ]
      });

      beforeEach(function () {
        [loggedUser, taggedUser] = dbData.users;
      });

      it('list of user\'s tags', // (may include user's story about the tag)
        async function () {
          const response = await agent
            .get(`/users/${taggedUser.username}/tags`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const userTags = response.body;

          should(userTags).have.propertyByPath('links', 'self')
            .eql(`${config.url.all}/users/${taggedUser.username}/tags`);

          userTags.should.have.property('data');
          should(userTags.data).have.length(5);

          const [firstTag] = userTags.data;

          const expectedTagname = dbData.userTag[3].tag.tagname;

          should(firstTag).have.property('type', 'user-tags');
          should(firstTag).have.property('attributes');
          should(firstTag).have.property('id',
            `${taggedUser.username}--${expectedTagname}`);

          const attrs = firstTag.attributes;

          should(attrs).have.properties({
            story: 'story',
            relevance: 5,
            username: taggedUser.username,
            tagname: expectedTagname
          });
        }
      );
    });

    describe('POST', function () {
      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 2,
        userTag: [
          [0, 1, 'story']
        ]
      });

      beforeEach(function () {
        [loggedUser, otherUser] = dbData.users;
      });

      let newUserTag;
      beforeEach(function () {
        newUserTag = {
          tagname: dbData.tags[0].tagname,
          story: 'here user can answer why she has that tag in her profile',
          relevance: 3
        };
      });

      context('logged in', function () {
        it('[self] add a tag to the user and respond 201', async function () {

          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send(serialize.newUserTag(newUserTag))
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const userTag = response.body;
          userTag.should.have.property('data');
          userTag.should.have.property('links');
          // userTag.should.have.property('meta');

          const data = userTag.data;
          const links = userTag.links;
          // let meta = userTag.meta;

          data.should.have.property('type', 'user-tags');
          data.should.have.property('id',
            `${loggedUser.username}--${newUserTag.tagname}`);

          links.should.have.property('self', `${config.url.all}/users/${loggedUser.username}/tags/${newUserTag.tagname}`);
          // links.should.have.property('related', `${config.url.all}/users/${loggedUser.username}/tags/${newUserTag.tagname}`);

          data.should.have.property('attributes');

          const attributes = data.attributes;

          attributes.should.have.property('story', newUserTag.story);
          attributes.should.have.property('relevance', 3);

          const userTagDb = await models.userTag.read(loggedUser.username,
            newUserTag.tagname);
          userTagDb.should.have.property('story', newUserTag.story);
          // userTagDb.should.have.property('relevance', newUserTag.relevance);
          userTagDb.should.have.property('user');
          userTagDb.should.have.property('tag');
          userTagDb.created.should.be.approximately(Date.now(), 1000);
        });

        it('[other user] error 403', async function () {
          let response = await agent
            .post(`/users/${otherUser.username}/tags`)
            .send(serialize.newUserTag(newUserTag))
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          let output = response.body;
          output.should.have.property('errors');
        });

        it('[duplicate relation] error 409', async function () {
          let response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send(serialize.newUserTag({
              tagname: dbData.tags[loggedUser.tags[0]].tagname,
              story: '************'
            }))
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(409)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          let output = response.body;
          output.should.have.property('errors');
        });

        it('[nonexistent tagname] error 404', async function () {
          let response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send(serialize.newUserTag({
              tagname: 'nonexistent-tag',
              story: 'this is a story'
            }))
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          let output = response.body;
          output.should.have.property('errors');
        });

        it('invalid data, error 400');
      });

      context('not logged in', function () {
        it('errors 403', async function () {
          let response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send(serialize.newUserTag(newUserTag))
            .set('Content-Type', 'application/vnd.api+json')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          let output = response.body;
          output.should.have.property('errors');
        });
      });
    });
  });

  describe('/users/:username/tags/:tagname', function () {
    describe('GET', function () {
      let loggedUser, taggedUser;

      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 8,
        userTag: [
          [1, 0, 'story'],
          [1, 1, 'story'],
          [1, 3, 'a story of relationship of taggedUser to relation3', 2],
          [1, 4, 'story'],
          [1, 5, 'story']
        ]
      });

      beforeEach(function () {
        [loggedUser, taggedUser] = dbData.users;
      });

      it('show tag with user\'s story to it', async function () {
        const userTag = dbData.userTag[2];

        const response = await agent
          .get(`/users/${taggedUser.username}/tags/${userTag.tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const respUserTag = response.body;
        respUserTag.should.have.property('data');
        respUserTag.should.have.property('links');

        const data = respUserTag.data;
        const links = respUserTag.links;

        data.should.have.property('type', 'user-tags');
        data.should.have.property('id',
          `${taggedUser.username}--${userTag.tag.tagname}`);

        links.should.have.property('self', `${config.url.all}/users/${userTag.user.username}/tags/${userTag.tag.tagname}`);

        should(data).have.property('attributes');
        const attributes = data.attributes;
        should(attributes).have.property('story', userTag.story);
        should(attributes).have.property('relevance', userTag.relevance);
        should(attributes).have.property('username', userTag.user.username);
        should(attributes).have.property('tagname', userTag.tag.tagname);
      });
    });

    describe('PATCH', function () {
      let loggedUser;

      beforeEachPopulate({
        users: 1, // how many users to make
        verifiedUsers: [0], // which  users to make verified
        tags: 1,
        userTag: [
          [0, 0, 'story', 3],
        ]
      });

      beforeEach(function () {
        [loggedUser] = dbData.users;
      });

      it('TODO invalid data');
      it('[story] update user\'s story of a tag', async function () {
        const userTag = dbData.userTag[0];

        const patchData = {
          data: {
            type: 'user-tags',
            id: `${loggedUser.username}--${userTag.tag.tagname}`,
            attributes: {
              story: 'a new story'
            }
          }
        };

        const response = await agent
          .patch(`/users/${loggedUser.username}/tags/${userTag.tag.tagname}`)
          .send(patchData)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const respUserTag = response.body;

        should(respUserTag).have.propertyByPath('data', 'attributes', 'story').equal('a new story');

        const userTagDb = await models.userTag.read(loggedUser.username,
          userTag.tag.tagname);
        should(userTagDb).have.property('story', 'a new story');
      });

      it('[relevance] update relevance of the tag for user', async function () {
        const userTag = dbData.userTag[0];

        const patchData = {
          data: {
            type: 'user-tags',
            id: `${loggedUser.username}--${userTag.tag.tagname}`,
            attributes: {
              relevance: 2
            }
          }
        };

        const response = await agent
          .patch(`/users/${loggedUser.username}/tags/${userTag.tag.tagname}`)
          .send(patchData)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const respUserTag = response.body;

        should(respUserTag).have.propertyByPath('data', 'attributes', 'relevance').equal(2);

        const userTagDb = await models.userTag.read(loggedUser.username,
          userTag.tag.tagname);
        should(userTagDb).have.property('relevance', 2);
      });
    });

    describe('DELETE', function () {

      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 8,
        userTag: [
          [1, 0, 'story'],
          [1, 1, 'story'],
          [0, 3, 'a story of relationship of taggedUser to relation3'],
          [1, 4, 'story'],
          [1, 5, 'story']
        ]
      });

      it('[user has tag] delete tag from user, respond with 204', async function () {
        let userTag = dbData.userTag[2];
        let user = userTag.user;
        let tag = userTag.tag;

        let response = await agent
          .delete(`/users/${user.username}/tags/${tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(user.username, user.password)
          .expect(204)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        should(Boolean(response.body)).equal(false);

        let userTagExists = await models.userTag.exists(user.username, tag.tagname);
        (userTagExists).should.equal(false);
      });

      it('[user doesn\'t have the tag] fail with 404', async function () {
        let user = dbData.users[0];
        let tag = dbData.tags[0];
        await agent
          .delete(`/users/${user.username}/tags/${tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(user.username, user.password)
          .expect(404)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[not me] fail with 403', async function () {
        let userTag = dbData.userTag[2];
        let user = userTag.user;
        let tag = userTag.tag;
        let otherUser = dbData.users[2];

        await agent
          .delete(`/users/${user.username}/tags/${tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(otherUser.username, otherUser.password)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });
});
