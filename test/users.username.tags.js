'use strict';

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
          [1, 0, 'story'],
          [1, 1, 'story'],
          [1, 3, 'story'],
          [1, 4, 'story'],
          [1, 5, 'story'],
        ]
      });

      beforeEach(function () {
        loggedUser = dbData.users[0];
        taggedUser = dbData.users[1];
      });

      it('list of user\'s tags', // (may include user's story about the tag)
        async function () {
          let response = await agent
            .get(`/users/${taggedUser.username}/tags`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          let userTags = response.body;
          userTags.should.have.property('data');
          userTags.data.length.should.equal(5);
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
        loggedUser = dbData.users[0];
        otherUser = dbData.users[1];
      });

      let newUserTag;
      beforeEach(function () {
        newUserTag = {
          tagname: dbData.tags[0].tagname,
          story: 'here user can answer why she has that tag in her profile'
        };
      });

      context('logged in', function () {
        it('[self] add a tag to the user and respond 201', async function () {
          let response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send(serialize.newUserTag(newUserTag))
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          let userTag = response.body;
          userTag.should.have.property('data');
          userTag.should.have.property('links');
          userTag.should.have.property('meta');

          let data = userTag.data;
          let links = userTag.links;
          let meta = userTag.meta;

          data.should.have.property('type', 'tags');
          data.should.have.property('id', newUserTag.tagname);

          links.should.have.property('self', `${config.url.all}/users/${loggedUser.username}/relationships/tags/${newUserTag.tagname}`);
          links.should.have.property('related', `${config.url.all}/users/${loggedUser.username}/tags/${newUserTag.tagname}`);

          meta.should.have.property('story', newUserTag.story);
          meta.should.have.property('created');
          meta.created.should.be.approximately(Date.now(), 1000);

          let userTagDb = await models.userTag.read(loggedUser.username,
            newUserTag.tagname);
          userTagDb.should.have.property('story');
          userTagDb.should.have.property('user');
          userTagDb.should.have.property('tag');
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
          [1, 3, 'a story of relationship of taggedUser to relation3'],
          [1, 4, 'story'],
          [1, 5, 'story']
        ]
      });

      beforeEach(function () {
        loggedUser = dbData.users[0];
        taggedUser = dbData.users[1];
      });

      it('show tag with user\'s story to it', async function () {
        let userTag = dbData.userTag[2];

        let response = await agent
          .get(`/users/${taggedUser.username}/tags/${userTag.tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        let respUserTag = response.body;
        respUserTag.should.have.property('data');
        respUserTag.should.have.property('links');
        respUserTag.should.have.property('meta');

        let data = respUserTag.data;
        let links = respUserTag.links;
        let meta = respUserTag.meta;

        data.should.have.property('type', 'tags');
        data.should.have.property('id', userTag.tag.tagname);

        links.should.have.property('self', `${config.url.all}/users/${userTag.user.username}/relationships/tags/${userTag.tag.tagname}`);
        links.should.have.property('related', `${config.url.all}/users/${userTag.user.username}/tags/${userTag.tag.tagname}`);

        meta.should.have.property('story', userTag.story);
        meta.should.have.property('created');
      });
    });

    describe('PATCH', function () {
      it('update user\'s relation/story to the tag');
      it('update user\'s rating of the tag (how important it is for her)');
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
