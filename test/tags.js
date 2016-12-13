'use strict';

let supertest = require('supertest'),
    should = require('should'),
    path = require('path'),
    _ = require('lodash');

let app = require(path.resolve('./app')),
    serializers = require(path.resolve('./serializers')),
    models = require(path.resolve('./models')),
    dbHandle = require(path.resolve('./test/handleDatabase')),
    config = require(path.resolve('./config/config'));

let deserialize = serializers.deserialize;
let serialize = serializers.serialize;

let agent = supertest.agent(app);

let dbData,
    loggedUser;


describe('/tags', function () {

  // clear database after every test
  afterEach(async function () {
    await dbHandle.clear();
  });

  describe('GET', function () {
    it('should show lists of tags');

    context('?filter[tagname][like]=string', function () {
      it('match tags with similar tagnames', async function () {
        throw new Error('todo');
      });
    });
  });

  describe('POST', function () {

    let newTag = {
      tagname: 'test-tag',
      description: 'this is a tag description!'
    };

    let serializedNewTag = serialize.newTag(newTag);

    let invalidTagname = {
      tagname: 'test--tag',
      description: 'this is a tag description!'
    };

    let serializedInvalidTagname = serialize.newTag(invalidTagname);

    // put pre-data into database
    beforeEach(async function () {
      let data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 1
      }
      // create data in database
      dbData = await dbHandle.fill(data);

      loggedUser = dbData.users[0];
    });

    context('logged in', function () {
      it('[good data] should create a tag and respond with 201', async function () {
        let response = await agent
            .post(`/tags`)
            .send(serializedNewTag)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

        // check that the newly created tag is there
        let tag = await models.tag.read(newTag.tagname);

        (typeof tag).should.equal('object');
        tag.should.have.property('tagname', newTag.tagname);
        tag.should.have.property('description', newTag.description);
        tag.should.have.property('creator');
        tag.creator.should.have.property('username', loggedUser.username);
      });

      it('[invalid tagname] should error with 400', async function () {
        let response = await agent
          .post(`/tags`)
          .send(serializedInvalidTagname)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[duplicate tagname] should error with 409', async function () {
        let response = await agent
          .post(`/tags`)
          .send(serialize.newTag(dbData.tags[0]))
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(409)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[invalid description]', async function () {
        let longDescription = _.repeat('.', 2049);
        let response = await agent
          .post(`/tags`)
          .send(serialize.newTag({
            tagname: 'new-tag',
            description: longDescription
          }))
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('not logged in', function () {
      it('should say 403 Forbidden', async function () {
        let response = await agent
          .post(`/tags`)
          .send(serializedNewTag)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, `${loggedUser.password}a`)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });
});

describe('/tags/:tagname', function () {
  // put pre-data into database
  beforeEach(async function () {
    let data = {
      users: 3, // how many users to make
      verifiedUsers: [0, 1], // which  users to make verified
      tags: 7
    }
    // create data in database
    dbData = await dbHandle.fill(data);

    loggedUser = dbData.users[0];
  });

  // clear database after every test
  afterEach(async function () {
    await dbHandle.clear();
  });

  describe('GET', function () {
    it('should show the tag', async function () {
      let existentTag = dbData.tags[0];
      let response = await agent
        .get(`/tags/${existentTag.tagname}`)
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(200)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      let tag = response.body;

      tag.should.have.property('data');
      tag.data.should.have.property('id', existentTag.tagname);
      tag.data.should.have.property('attributes');

      let attrs = tag.data.attributes;
      attrs.should.have.property('tagname', existentTag.tagname);
      attrs.should.have.property('description', existentTag.description);

      // TODO figure out JSON API creator & contributors...
    });

    it('show creator'); // as a json api relation

    it('[nonexistent tagname] should error 404', async function () {
      let existentTag = dbData.tags[0];
      let response = await agent
        .get(`/tags/nonexistent-tag`)
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(404)
        .expect('Content-Type', /^application\/vnd\.api\+json/)

      response.body.should.have.property('errors');
    });

    it('[invalid tagname] should error 400', async function () {
      let existentTag = dbData.tags[0];
      let response = await agent
        .get(`/tags/invalid_tag`)
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(400)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      response.body.should.have.property('errors');
    });
  });

  describe('PATCH', function () {
    it('update the tag (description, not tagname)');
    it('keep history (vcdiff, zlib)');
    // http://ericsink.com/entries/time_space_tradeoffs.html
  });

  describe('DELETE', function () {
    it('should delete the tag (when sufficient rights)');
  });
});
