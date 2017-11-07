'use strict';

const should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const agentFactory = require('./agent'),
      dbHandle = require(path.resolve('./test/handleDatabase')),
      models = require(path.resolve('./models')),
      serializers = require(path.resolve('./serializers')),
      tagJobs = require(path.resolve('./jobs/tags'));

const serialize = serializers.serialize;

let agent,
    dbData,
    loggedUser,
    sandbox;

describe('/tags', function () {

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    agent = agentFactory();
  });
  // clear database after every test
  afterEach(async function () {
    await dbHandle.clear();
    sandbox.restore();
  });

  describe('GET', function () {
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

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        it('match tags with similar tagnames', async function () {
          const response = await agent
            .get('/tags?filter[tagname][like]=named-tag')
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
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const foundTags = response.body;
          foundTags.should.have.property('data');
          foundTags.data.length.should.equal(4);
        });
        // i.e. name matches name, namespace, named, namel, first-name, tag-name
        // doesn't match tagname, username, firstname

        it('limit the output', async () => {
          const response = await agent
            .get('/tags?filter[tagname][like]=tag&page[offset]=0&page[limit]=3')
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const foundTags = response.body;
          should(foundTags).have.property('data').Array().length(3);
        });

        it('[too high limit] respond 400', async () => {
          await agent
            .get('/tags?filter[tagname][like]=tag&page[offset]=0&page[limit]=21')
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[query.page[offset] different from 0] respond 400', async () => {
          await agent
            .get('/tags?filter[tagname][like]=tag&page[offset]=2&page[limit]=5')
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });

      context('not logged', () => {
        it('403', async () => {
          await agent
            .get('/tags?filter[tagname][like]=named-tag')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
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

        beforeEach(() => {
          const [me] = dbData.users;
          agent = agentFactory.logged(me);
        });

        it('respond with tags related to my tags', async function () {
          const resp = await agent
            .get('/tags?filter[relatedToMyTags]')
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

        it('limit the output', async function () {
          const resp = await agent
            .get('/tags?filter[relatedToMyTags]&page[offset]=0&page[limit]=3')
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(resp.body).have.property('data').Array().length(3);
        });

        it('offset the output', async function () {
          const resp = await agent
            .get('/tags?filter[relatedToMyTags]&page[offset]=2&page[limit]=10')
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(resp.body).have.property('data').Array().length(3);
          const [tagC, tagD, tagE] = resp.body.data;

          testTag(tagC, { tagname: 'tag6'});
          testTag(tagD, { tagname: 'tag4'});
          testTag(tagE, { tagname: 'tag8'});
        });

        context('invalid', function () {
          it('[too high query.page[limit]] 400', async function () {
            await agent
              .get('/tags?filter[relatedToMyTags]&page[offset]=0&page[limit]=21')
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });
        });
      });

      context('not logged', function () {
        it('403', async function () {
          await agent
            .get('/tags?filter[relatedToMyTags]')
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

        beforeEach(() => {
          const [me] = dbData.users;
          agent = agentFactory.logged(me);
        });

        it('[default] respond with an array of 1 random tag', async function () {
          const resp = await agent
            .get('/tags?filter[random]')
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(resp.body).have.property('data').Array().length(1);
        });

        it('[pagination] respond array with {page[limit]} elements', async function () {
          const resp = await agent
            .get('/tags?filter[random]&page[offset]=0&page[limit]=7')
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(resp.body).have.property('data').Array().length(7);
        });

        it('[too high page[limit]] 400', async function () {
          await agent
            .get('/tags?filter[random]&page[offset]=0&page[limit]=21')
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });

      context('not logged', function () {
        it('403', async function () {
          await agent
            .get('/tags?filter[random]')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    describe('/tags?filter[relatedToTags]=tag1,tag2,tag3', function () {
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
        [loggedUser] = dbData.users;
      });

      // clear database after every test
      afterEach(async function () {
        await dbHandle.clear();
      });

      context('logged in', function () {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', function () {

          function testTag(jsonApiTag, { tagname }) {
            should(jsonApiTag).have.property('id', tagname);
          }

          it('[example 1] respond with tags related to the list of tags', async function () {

            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag0,tag1')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(3);
            const [tagA, tagB, tagC] = resp.body.data;

            testTag(tagA, { tagname: 'tag5'});
            testTag(tagB, { tagname: 'tag6'});
            testTag(tagC, { tagname: 'tag4'});
          });

          it('[example 2] respond with tags related to the list of tags', async function () {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag0')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(3);
            const [tagA, tagB, tagC] = resp.body.data;

            testTag(tagA, { tagname: 'tag1'});
            testTag(tagB, { tagname: 'tag5'});
            testTag(tagC, { tagname: 'tag4'});
          });

          it('[example 3] respond with tags related to the list of tags', async function () {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag1')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(4);
            const [tagA, tagB, tagC, tagD] = resp.body.data;

            testTag(tagA, { tagname: 'tag6'});
            testTag(tagB, { tagname: 'tag5'});
            testTag(tagC, { tagname: 'tag0'});
            testTag(tagD, { tagname: 'tag4'});
          });

          it('[example 4] respond with tags related to the list of tags', async function() {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag3')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(0);

          });

          it('[example 5] respond with tags related to the list of tags', async function() {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag0,tag1,tag2,tag3,tag4,tag5,tag6')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(0);

          });

          it('[example 6] respond with tags related to the list of tags', async function() {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag0,tag1,tag2,tag3,tag4,tag5,tag6')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(0);

          });

          it('[example 7] respond with tags related to the list of tags', async function() {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag3,tag4,tag4')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(3);
            const [tagA, tagB, tagC] = resp.body.data;

            testTag(tagA, { tagname: 'tag1'});
            testTag(tagB, { tagname: 'tag5'});
            testTag(tagC, { tagname: 'tag0'});

          });

          it('[offset and limit] respond with tags related to the list of tags', async function () {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag1&page[limit]=2&page[offset]=1')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(2);
            const [tagB, tagC] = resp.body.data;

            testTag(tagB, { tagname: 'tag5'});
            testTag(tagC, { tagname: 'tag0'});
          });
        });

        context('invalid data', function () {
          function testTag(jsonApiTag, { tagname }) {
            should(jsonApiTag).have.property('id', tagname);
          }

          it('[invalid tagname(s)] error 400', async function() {
            await agent
              .get('/tags?filter[relatedToTags]=ta-*-+A,tag4')
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          // TODO error 404 reaction for nonexistent tagname(s) if needed

          // ignore nonexistent tagname(s) in request
          it('[nonexistent tagname(s)]: ignore', async function () {
            const resp = await agent
              .get('/tags?filter[relatedToTags]=tag0,tag1,tag9')
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(resp.body).have.property('data').Array().length(3);
            const [tagA, tagB, tagC] = resp.body.data;

            testTag(tagA, { tagname: 'tag5'});
            testTag(tagB, { tagname: 'tag6'});
            testTag(tagC, { tagname: 'tag4'});
          });

          it('[too high page[limit]] 400', async function () {
            await agent
              .get('/tags?filter[relatedToTags]=tag1&page[limit]=21&page[offset]=0')
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

          });

        });
      });

      context('not logged in', async function () {
        it('403', async function () {
          await agent
            .get('/tags?filter[relatedToTags]=tag0,tag1')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
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

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      it('[good data] should create a tag and respond with 201', async function () {
        await agent
          .post('/tags')
          .send(serializedNewTag)
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
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[too short tagname] should error with 400', async function () {
        await agent
          .post('/tags')
          .send({ data: { type: 'tags', attributes: { tagname: 'a' } } })
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[too long tagname] should error with 400', async function () {
        await agent
          .post('/tags')
          .send({ data: { type: 'tags', attributes: { tagname: 'a'.repeat(65) } } })
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[duplicate tagname] should error with 409', async function () {
        await agent
          .post('/tags')
          .send(serialize.newTag(dbData.tags[0]))
          .expect(409)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });

    context('not logged in', function () {
      it('should say 403 Forbidden', async function () {
        await agent
          .post('/tags')
          .send(serializedNewTag)
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

    sandbox = sinon.sandbox.create();

    agent = agentFactory();
  });

  // clear database after every test
  afterEach(async function () {
    await dbHandle.clear();
    sandbox.restore();
  });

  describe('GET', function () {
    context('logged', () => {
      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      it('should show the tag', async function () {
        const response = await agent
          .get(`/tags/${existentTag.tagname}`)
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
          .expect(404)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        response.body.should.have.property('errors');
      });

      it('[invalid tagname] should error 400', async function () {
        const response = await agent
          .get('/tags/invalid_tag')
          .expect(400)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        response.body.should.have.property('errors');
      });
    });

    context('not logged', () => {
      it('403', async function () {
        await agent
          .get(`/tags/${existentTag.tagname}`)
          .expect(403);
      });
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
    sandbox = sinon.sandbox.create();
  });

  // clear database after every test
  afterEach(async function () {
    await dbHandle.clear();
    sandbox.restore();
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
