'use strict';

const path = require('path'),
      should = require('should');

const dbHandle = require('./handle-database');
const agentFactory = require('./agent');
const models = require(path.resolve('./models'));

testDitsTags('idea');
testDitsTags('challenge');

function testDitsTags(dit){
  describe(`tags of ${dit}`, () => {

    let agent,
        dbData,
        existentDit,
        loggedUser,
        otherUser,
        tag0,
        tag1;

    beforeEach(() => {
      agent = agentFactory();
    });

    beforeEach(async () => {
      const data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 5,
        [`${dit}s`]: [
          [{ }, 0],
          [{ }, 1]
        ],
        // ditTag [0, 0] shouldn't be created here; is created in tests for POST
        [`${dit}Tags`]: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 4]]
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser, otherUser] = dbData.users;
      [existentDit] = dbData[`${dit}s`];
      [tag0, tag1] = dbData.tags;
    });

    afterEach(async () => {
      await dbHandle.clear();
    });

    describe(`POST /${dit}s/:id/tags`, () => {
      let postBody;

      beforeEach(() => {
        postBody = { data: {
          type: `${dit}-tags`,
          relationships: {
            tag: { data: { type: 'tags', id: tag0.tagname } }
          }
        } };
      });

      context(`logged as ${dit} creator`, () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', () => {
          it(`[${dit} and tag exist and ${dit}Tag doesn't] 201`, async () => {
            const response = await agent
              .post(`/${dit}s/${existentDit.id}/tags`)
              .send(postBody)
              .expect(201);
            const ditTagDb = await models.ditTag.read(dit, existentDit.id, tag0.tagname);
            should(ditTagDb).match({
              [`${dit}`]: { id: existentDit.id },
              tag: { tagname: tag0.tagname },
              creator: { username: loggedUser.username }
            });
            should(response.body).match({
              data: {
                type: `${dit}-tags`,
                id: `${existentDit.id}--${tag0.tagname}`,
                relationships: {
                  [`${dit}`]: { data: { type: `${dit}s`, id: existentDit.id } },
                  tag: { data: { type: 'tags', id: tag0.tagname } },
                  creator: { data: { type: 'users', id: loggedUser.username } }
                }
              }
            });
          });

          it(`[duplicate ${dit}Tag] 409`, async () => {
            // first it's ok
            await agent
              .post(`/${dit}s/${existentDit.id}/tags`)
              .send(postBody)
              .expect(201);

            // duplicate request should error
            await agent
              .post(`/${dit}s/${existentDit.id}/tags`)
              .send(postBody)
              .expect(409);
          });

          it(`[${dit} doesn't exist] 404`, async () => {
            const response = await agent
              .post(`/${dit}s/00000000/tags`)
              .send(postBody)
              .expect(404);

            should(response.body).deepEqual({
              errors: [{
                status: 404,
                detail: `${dit} not found`
              }]
            });
          });

          it('[tag doesn\'t exist] 404', async () => {
            // set nonexistent tag in body
            postBody.data.relationships.tag.data.id = 'nonexistent-tag';

            const response = await agent
              .post(`/${dit}s/${existentDit.id}/tags`)
              .send(postBody)
              .expect(404);

            should(response.body).deepEqual({
              errors: [{
                status: 404,
                detail: 'tag not found'
              }]
            });
          });

        });

        context('invalid data', () => {
          it('[invalid id] 400', async () => {
            await agent
              .post(`/${dit}s/invalid-id/tags`)
              .send(postBody)
              .expect(400);
          });

          it('[invalid tagname] 400', async () => {
            // invalidate tagname
            postBody.data.relationships.tag.data.id = 'invalidTagname';

            await agent
              .post(`/${dit}s/${existentDit.id}/tags`)
              .send(postBody)
              .expect(400);
          });

          it('[missing tagname] 400', async () => {
            // invalidate tagname
            delete postBody.data.relationships.tag;

            await agent
              .post(`/${dit}s/${existentDit.id}/tags`)
              .send(postBody)
              .expect(400);
          });

          it('[additional properties in body] 400', async () => {
            // add some attributes (or relationships)
            postBody.data.attributes = { foo: 'bar' };

            await agent
              .post(`/${dit}s/${existentDit.id}/tags`)
              .send(postBody)
              .expect(400);
          });
        });

      });

      context(`logged, not ${dit} creator`, () => {
        beforeEach(() => {
          agent = agentFactory.logged(otherUser);
        });

        it('403', async () => {
          const response = await agent
            .post(`/${dit}s/${existentDit.id}/tags`)
            .send(postBody)
            .expect(403);

          should(response.body).deepEqual({
            errors: [{ status: 403, detail: `not logged in as ${dit} creator` }]
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          await agent
            .post(`/${dit}s/${existentDit.id}/tags`)
            .send(postBody)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s/:id/tags`, () => {
      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged();
        });

        context('valid data', () => {
          it(`[${dit} exists] 200 and list of ${dit}-tags`, async () => {
            const response = await agent
              .get(`/${dit}s/${existentDit.id}/tags`)
              .expect(200);

            const responseData = response.body.data;

            should(responseData).Array().length(4);
          });

          it(`[${dit} doesn't exist] 404`, async () => {
            const response = await agent
              .get(`/${dit}s/00000001/tags`)
              .expect(404);

            should(response.body).match({ errors: [{
              status: 404,
              detail: `${dit} not found`
            }] });
          });
        });

        context('invalid data', () => {
          it('[invalid id] 400', async () => {
            await agent
              .get(`/${dit}s/invalidId/tags`)
              .expect(400);
          });
        });

      });

      context('not logged', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s/${existentDit.id}/tags`)
            .expect(403);
        });
      });

    });

    describe(`DELETE /${dit}s/:id/tags/:tagname`, () => {

      context(`logged as ${dit} creator`, () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', () => {
          it(`[${dit}-tag exists] 204`, async () => {
            const ditTag = await models.ditTag.read(dit, existentDit.id, tag1.tagname);

            // first  ditTag exists
            should(ditTag).Object();

            await agent
              .delete(`/${dit}s/${existentDit.id}/tags/${tag1.tagname}`)
              .expect(204);

            const ditTagAfter = await models.ditTag.read(dit, existentDit.id, tag1.tagname);
            // the ditTag doesn't exist
            should(ditTagAfter).be.undefined();

          });

          it(`[${dit}-tag doesn't exist] 404`, async () => {
            await agent
              .delete(`/${dit}s/${existentDit.id}/tags/${tag0.tagname}`)
              .expect(404);
          });
        });

        context('invalid data', () => {
          it('[invalid id] 400', async () => {
            await agent
              .delete(`/${dit}s/invalid-id/tags/${tag1.tagname}`)
              .expect(400);
          });

          it('[invalid tagname] 400', async () => {
            await agent
              .delete(`/${dit}s/${existentDit.id}/tags/invalid--tagname`)
              .expect(400);
          });
        });

      });

      context(`logged, not ${dit} creator`, () => {

        beforeEach(() => {
          agent = agentFactory.logged(otherUser);
        });

        it('403', async () => {
          const response = await agent
            .delete(`/${dit}s/${existentDit.id}/tags/${tag1.tagname}`)
            .expect(403);

          should(response.body).deepEqual({
            errors: [{ status: 403, detail: `not logged in as ${dit} creator` }]
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          const response = await agent
            .delete(`/${dit}s/${existentDit.id}/tags/${tag1.tagname}`)
            .expect(403);

          should(response.body).not.deepEqual({
            errors: [{ status: 403, detail: `not logged in as ${dit} creator` }]
          });
        });
      });

    });
  });
}