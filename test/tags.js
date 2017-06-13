'use strict';

const supertest = require('supertest'),
      should = require('should'),
      path = require('path');

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
        const data = {
          users: 3, // how many users to make
          verifiedUsers: [0], // which  users to make verified
          namedTags: ['named-tag-1', 'other-tag-0', 'named-tag-2', 'tag', 'utag', 'etags']
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser] = dbData.users;
      });

      it('match tags with similar tagnames', async function () {
        const response = await agent
          .get('/tags?filter[tagname][like]=named-tag')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const foundTags = response.body;
        foundTags.should.have.property('data');
        foundTags.data.length.should.equal(2);
        should(foundTags.data).containDeep([
          { id: 'named-tag-1' },
          { id: 'named-tag-2' }
        ]);
      });

      it('don\'t match tags in the middle of a word, but match after hyphen', async function () {
        const response = await agent
          .get('/tags?filter[tagname][like]=tag')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const foundTags = response.body;
        foundTags.should.have.property('data');
        foundTags.data.length.should.equal(4);
      });
      // i.e. name matches name, namespace, named, namel, first-name, tag-name
      // doesn't match tagname, username, firstname
    });

    describe('/tags?filter[relatedToMyTags]', function () {

      function testTag(jsonApiTag, { tagname }) {
        should(jsonApiTag).have.property('id', tagname);
      }

      beforeEach(async function () {
        const data = {
          users: 5, // how many users to make
          verifiedUsers: [0, 1, 2, 3, 4], // which  users to make verified
          tags: 10,
          userTag: [
            [0, 0, '', 5],
            [0, 1, '', 4],
            [0, 2, '', 3],
            [0, 3, '', 2],
            [1, 0, '', 1],
            [1, 1, '', 5],
            [2, 1, '', 4],
            [2, 2, '', 3],
            [3, 1, '', 2],
            [1, 4, '', 1],
            [1, 5, '', 5],
            [2, 5, '', 4],
            [2, 6, '', 3],
            [2, 7, '', 2],
            [3, 7, '', 1],
            [3, 8, '', 5],
            [4, 9, '', 4]
          ]
        };

        // create data in database
        dbData = await dbHandle.fill(data);
      });

      // clear database after every test
      afterEach(async function () {
        await dbHandle.clear();
      });

      context('logged', function () {
        it('respond with tags related to my tags', async function () {
          const [me] = dbData.users;

          const resp = await agent
            .get('/tags?filter[relatedToMyTags]')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(resp.body).have.property('data').Array().length(5);
          const [tagA, tagB, tagC, tagD, tagE] = resp.body.data;

          testTag(tagA, { tagname: 'tag5'});
          testTag(tagB, { tagname: 'tag7'});
          testTag(tagC, { tagname: 'tag6'});
          testTag(tagD, { tagname: 'tag4'});
          testTag(tagE, { tagname: 'tag8'});
        });
      });

      context('not logged', function () {
        it('403', async function () {
          await agent
            .get('/tags?filter[relatedToMyTags]')
            .set('Content-Type', 'application/vnd.api+json')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    describe('get random tags: GET /tags?filter[random]', function () {
      beforeEach(async function () {
        const data = {
          users: 1, // how many users to make
          verifiedUsers: [0], // which  users to make verified
          tags: 10,
        };

        // create data in database
        dbData = await dbHandle.fill(data);
      });

      // clear database after every test
      afterEach(async function () {
        await dbHandle.clear();
      });

      context('logged', function () {
        it('[default] respond with an array of 1 random tag', async function () {
          const [me] = dbData.users;

          const resp = await agent
            .get('/tags?filter[random]')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(me.username, me.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(resp.body).have.property('data').Array().length(1);
        });
      });

      context('not logged', function () {
        it('403', async function () {
          await agent
            .get('/tags?filter[random]')
            .set('Content-Type', 'application/vnd.api+json')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    describe.only('/tags?filter[relatedToTags]=tag1,tag2,tag3', function () {

      beforeEach(async function () {
        const data = {
          users: 4, // how many users to make
          verifiedUsers: [0, 1, 2, 3], // which  users to make verified
          tags: 7,
          userTag: [
            [0, 0, '', 1],
            [0, 1, '', 3],
            [0, 4, '', 1],
            [0, 5, '', 3],
            [1, 1, '', 4],
            [1, 5, '', 4],
            [1, 6, '', 2],
            [2, 1, '', 5],
            [2, 6, '', 4],
            [3, 2, '', 4]
          ]
        };

        // create data in database
        dbData = await dbHandle.fill(data);
      });

      // clear database after every test
      afterEach(async function () {
        await dbHandle.clear();
      });

      context('logged in', function () {
        context('valid data', function () {

          function testTag(jsonApiTag, { tagname }) {
            should(jsonApiTag).have.property('id', tagname);
          }

          it('[example 1] respond with tags related to the list of tags', async function () {
            const [loggedUser] = dbData.users;
            console.log(loggedUser)

            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag0,tag1')
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(3);
            const tags = resp.body.data;
            const [tagA, tagB, tagC] = response.body.data;

            testTag(tagA, { tagname: 'tag5'});
            testTag(tagB, { tagname: 'tag6'});
            testTag(tagC, { tagname: 'tag4'});
          });

          it('[example 2] respond with tags related to the list of tags', async function () {
            const [loggedUser] = dbData.users;
            console.log(loggedUser)
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag0')
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(2);
            const tags = resp.body.data;
            const [tagA, tagB] = response.body.data;

            testTag(tagA, { tagname: 'tag5'});
            testTag(tagB, { tagname: 'tag4'});
          });

          it('[example 3] respond with tags related to the list of tags', async function () {
            const [loggedUser] = dbData.users;
            console.log(loggedUser)
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag1')
              .set('Content-Type', 'application/vnd.api+json')
              .auth(loggedUser.username, loggedUser.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(3);
            const tags = resp.body.data;
            const [tagA, tagB, tagC] = response.body.data;

            testTag(tagA, { tagname: 'tag6'});
            testTag(tagB, { tagname: 'tag5'});
            testTag(tagC, { tagname: 'tag4'});
          });
        });

        context('invalid data', function () {
          it('[invalid tagname(s)] error 400');
          it('[nonexistent tagname(s)] error 404 (or ignore?)');
        });
      });

      context('not logged in', function () {
        it('error 403');
      });
      
    });
  });

  describe('POST', function () {

    const newTag = {
      tagname: 'test-tag'
    };

    const serializedNewTag = serialize.newTag(newTag);

    const invalidTagname = {
      tagname: 'test--tag'
    };

    const serializedInvalidTagname = serialize.newTag(invalidTagname);

    // put pre-data into database
    beforeEach(async function () {
      const data = {
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
        const tag = await models.tag.read(newTag.tagname);

        (typeof tag).should.equal('object');
        tag.should.have.property('tagname', newTag.tagname);
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
    const data = {
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
      const response = await agent
        .get(`/tags/${existentTag.tagname}`)
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(200)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      const tag = response.body;

      tag.should.have.property('data');
      tag.data.should.have.property('id', existentTag.tagname);
      tag.data.should.have.property('attributes');

      const attrs = tag.data.attributes;
      attrs.should.have.property('tagname', existentTag.tagname);

    });

    it('[nonexistent tagname] should error 404', async function () {
      const response = await agent
        .get('/tags/nonexistent-tag')
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(404)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      response.body.should.have.property('errors');
    });

    it('[invalid tagname] should error 400', async function () {
      const response = await agent
        .get('/tags/invalid_tag')
        .set('Content-Type', 'application/vnd.api+json')
        .auth(loggedUser.username, loggedUser.password)
        .expect(400)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      response.body.should.have.property('errors');
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
