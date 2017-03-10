'use strict';

const supertest = require('supertest'),
      should = require('should'),
      path = require('path'),
      _ = require('lodash');

const app = require(path.resolve('./app')),
      serializers = require(path.resolve('./serializers')),
      models = require(path.resolve('./models')),
      tagJobs = require(path.resolve('./jobs/tags')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const serialize = serializers.serialize;

const agent = supertest.agent(app);

let dbData,
    loggedUser;


describe('/tags', function () {

  // clear database after every test
  afterEach(async function () {
    await dbHandle.clear();
  });

  describe('GET', function () {
    it('should show lists of tags');

    describe('/tags?filter[tagname][like]=string', function () {

      // seed the database with users and some named tags to do filtering on
      beforeEach(async function () {
        let data = {
          users: 3, // how many users to make
          verifiedUsers: [0], // which  users to make verified
          namedTags: ['named-tag-1', 'other-tag-0', 'named-tag-2']
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser] = dbData.users;
      });

      it('match tags with similar tagnames', async function () {
        let response = await agent
          .get('/tags?filter[tagname][like]=named-tag')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        let foundTags = response.body;
        foundTags.should.have.property('data');
        foundTags.data.length.should.equal(2);
        should(foundTags.data).containDeep([
          { id: 'named-tag-1' },
          { id: 'named-tag-2' }
        ]);
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
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser] = dbData.users;
    });

    context('logged in', function () {
      it('[good data] should create a tag and respond with 201', async function () {
        await agent
            .post('/tags')
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
        await agent
          .post('/tags')
          .send(serializedInvalidTagname)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[duplicate tagname] should error with 409', async function () {
        await agent
          .post('/tags')
          .send(serialize.newTag(dbData.tags[0]))
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(409)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[invalid description]', async function () {
        let longDescription = _.repeat('.', 2049);
        await agent
          .post('/tags')
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
        await agent
          .post('/tags')
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
  let existentTag;

  // put pre-data into database
  beforeEach(async function () {
    let data = {
      users: 3, // how many users to make
      verifiedUsers: [0, 1], // which  users to make verified
      tags: 7
    };
    // create data in database
    dbData = await dbHandle.fill(data);
    [existentTag] = dbData.tags;

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
      let response = await agent
        .get('/tags/nonexistent-tag')
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(404)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      response.body.should.have.property('errors');
    });

    it('[invalid tagname] should error 400', async function () {
      let response = await agent
        .get('/tags/invalid_tag')
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(400)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      response.body.should.have.property('errors');
    });
  });

  describe('PATCH', function () {
    context('logged in', function () {
      it('[valid description] update the tag description', async function () {
        let description = 'a new description of the tag';

        await agent
          .patch(`/tags/${existentTag.tagname}`)
          .send({
            data: {
              type: 'tags',
              id: existentTag.tagname,
              attributes: { description }
            }
          })
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        // check that the newly created tag is there
        let tag = await models.tag.read(existentTag.tagname);

        (typeof tag).should.equal('object');
        tag.should.have.property('description', description);
      });

      it('keep history (vcdiff, zlib)');
      // http://ericsink.com/entries/time_space_tradeoffs.html
    });
  });

});

describe('Deleting unused tags.', function () {

  beforeEach(async function () {
    const data = {
      users: 1, // how many users to make
      verifiedUsers: [0], // which  users to make verified
      tags: 5,
      userTag: [
        [0, 1],
        [0, 2]
      ]
    };

    // create data in database
    dbData = await dbHandle.fill(data);
  });

  // clear database after every test
  afterEach(async function () {
    await dbHandle.clear();
  });

  it('Unused tags should be deleted regularly with a cron-like job.', async function () {
    // before we should have 5 tags
    const countBefore = await models.tag.count();
    should(countBefore).equal(5);

    await tagJobs.deleteAbandoned();

    // after running the job function we should have 2 tags left
    const countAfter = await models.tag.count();
    should(countAfter).equal(2);
  });
});
