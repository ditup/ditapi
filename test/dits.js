'use strict';

const path = require('path'),
      should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

/*
  Tests for functionalities common for sll of the dits.
  Those are: ideas, challenges
 */

testDitsCommonFunctionalities('idea');
testDitsCommonFunctionalities('challenge');

/*
  Function takes type of a dit as an argument
  and runs all of the test
*/
function testDitsCommonFunctionalities(dit){
  describe('dits', () => {
    let agent,
        dbData,
        loggedUser;

    afterEach(async () => {
      await dbHandle.clear();
    });

    beforeEach(() => {
      agent = agentFactory();
    });

    describe(`POST /${dit}s`, () => {
      let newDitBody;

      beforeEach(() => {
        newDitBody = { data: {
          type: `${dit}s`,
          attributes: {
            title: `A testing ${dit} 1`,
            detail: `This is a testing ${dit} detail.`,
            ditType: `${dit}`
          }
        } };
      });

      // put pre-data into database
      beforeEach(async () => {
        const data = {
          users: 3, // how many users to make
          verifiedUsers: [0, 1] // which  users to make verified
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        loggedUser = dbData.users[0];
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', () => {

          it(`should create ${dit} and respond with 201`, async () => {
            const response = await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(201)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            // respond with the new dit
            const newDitResponseBody = response.body;
            // is response body correct?
            should(newDitResponseBody).match({
              data: {
                type: `${dit}s`,
                attributes: {
                  title: `A testing ${dit} 1`,
                  detail: `This is a testing ${dit} detail.`
                }
              }
            });

            should(newDitResponseBody).have.propertyByPath('data', 'id');
            should(newDitResponseBody).have.propertyByPath('data', 'attributes', 'created');

            // is the new dit saved in database?
            const newDitDb = await models.dit.read(`${dit}`, response.body.data.id);
            // does the dit id equal the dit key in database?
            should(newDitDb.id).eql(response.body.data.id);

            // data should contain creator as relationship
            should(newDitResponseBody)
              .have.propertyByPath('data', 'relationships', 'creator')
              .match({
                data: {
                  type: 'users', id: loggedUser.username
                }
              });
          });

        });

        context('invalid data', () => {

          it(`[empty ${dit} title] 400`, async () => {
            // invalid body
            newDitBody.data.attributes.title = '    ';

            await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it(`[too long ${dit} title] 400`, async () => {
            // invalid body
            newDitBody.data.attributes.title = 'a'.repeat(257);

            await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it(`[missing ${dit} title] 400`, async () => {
            // invalid body
            delete newDitBody.data.attributes.title;

            await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it(`[too long ${dit} detail] 400`, async () => {
            // invalid body
            newDitBody.data.attributes.detail = 'a'.repeat(2049);

            await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it(`[missing ${dit} detail] 400`, async () => {
            // invalid body
            delete newDitBody.data.attributes.detail;

            await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[unexpected property] 400', async () => {
            // invalid body
            newDitBody.data.attributes.unexpected = 'asdf';

            await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[XSS in body] sanitize', async () => {
            // body with XSS
            newDitBody.data.attributes.detail = `<script>alert('asdf')</script>
              <a href="javascript: alert('asdf')">foo</a>
              <i>italic</i>
              <a href="https://example.com">bar</a>
            `;
            const response = await agent
              .post(`/${dit}s`)
              .send(newDitBody)
              .expect(201)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            // respond with the new dit
            const newDitResponseBody = response.body;

            should(newDitResponseBody).have.propertyByPath('data', 'attributes', 'detail').eql(`<i>italic</i>
              <a href="https://example.com">bar</a>`);

          });
        });
      });

      context('not logged in', () => {
        it('should say 403 Forbidden', async () => {
          await agent
            .post(`/${dit}s`)
            .send(newDitBody)
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    describe(`GET /${dit}s/:id`, () => {

      let dit0;

      beforeEach(async () => {
        const data = {
          users: 3, // how many users to make
          verifiedUsers: [0, 1], // which  users to make verified
          [`${dit}s`]: [[{}, 0]]
        };
        // create data in database
        dbData = await dbHandle.fill(data);
        loggedUser = dbData.users[0];
        dit0 = dbData[`${dit}s`][0];
      });

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid', () => {
          it(`[exists] read ${dit} by id`, async () => {
            const response = await agent
              .get(`/${dit}s/${dit0.id}`)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).match({
              data: {
                type: `${dit}s`,
                id: dit0.id,
                attributes: {
                  title: dit0.title,
                  detail: dit0.detail
                },
                relationships: {
                  creator: {
                    data: { type: 'users', id: dit0.creator.username }
                  }
                }
              }
            });
          });

          it('[not exist] 404', async () => {
            await agent
              .get(`/${dit}s/0013310`)
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

        });

        context('invalid', () => {
          it('[invalid id] 400', async () => {
            await agent
              .get(`/${dit}s/invalid-id`)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s/${dit0.id}`)
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    describe(`PATCH /${dit}s/:id`, () => {

      let dit0,
          dit1,
          patchBody;

      beforeEach(async () => {
        const data = {
          users: 3, // how many users to make
          verifiedUsers: [0, 1], // which  users to make verified
          [`${dit}s`]: [[{ }, 0], [{ }, 1]]
        };
        // create data in database
        dbData = await dbHandle.fill(data);

        loggedUser = dbData[`${dit}s`][0];
        [dit0, dit1] = dbData[`${dit}s`];
      });

      beforeEach(() => {
        patchBody = {
          data: {
            type: `${dit}s`,
            id: dit0.id,
            attributes: {
              title: 'this is a new title',
              detail: 'this is a new detail'
            }
          }
        };
      });

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid', () => {
          it(`[${dit} exists, creator, title] 200 and update in db`, async () => {
            delete patchBody.data.attributes.detail;

            const { title } = patchBody.data.attributes;
            const { id, detail } = dit0;
            const response = await agent
              .patch(`/${dit}s/${id}`)
              .send(patchBody)
              .expect(200);

            should(response.body).match({
              data: {
                type: `${dit}s`,
                id,
                attributes: { title, detail }
              }
            });

            const ditDb = await models.dit.read(`${dit}`, dit0.id);

            should(ditDb).match({ id, title, detail });
          });

          it(`[${dit} exists, creator, detail] 200 and update in db`, async () => {
            delete patchBody.data.attributes.title;

            const { detail } = patchBody.data.attributes;
            const { id, title } = dit0;

            const response = await agent
              .patch(`/${dit}s/${id}`)
              .send(patchBody)
              .expect(200);

            should(response.body).match({
              data: {
                type: `${dit}s`,
                id,
                attributes: { title, detail }
              }
            });

            const ditDb = await models.dit.read(`${dit}`, dit0.id);

            should(ditDb).match({ id, title, detail });
          });

          it(`[${dit} exists, creator, title, detail] 200 and update in db`, async () => {
            const { title, detail } = patchBody.data.attributes;
            const { id } = dit0;

            const response = await agent
              .patch(`/${dit}s/${id}`)
              .send(patchBody)
              .expect(200);

            should(response.body).match({
              data: {
                type: `${dit}s`,
                id,
                attributes: { title, detail }
              }
            });

            const ditDb = await models.dit.read(`${dit}`, dit0.id);
            should(ditDb).match({ id, title, detail });
          });

          it(`[${dit} exists, not creator] 403`, async () => {
            patchBody.data.id = dit1.id;

            const response = await agent
              .patch(`/${dit}s/${dit1.id}`)
              .send(patchBody)
              .expect(403);

            should(response.body).match({
              errors: [{
                status: 403,
                detail: 'only creator can update'
              }]
            });
          });

          it(`[${dit} not exist] 404`, async () => {
            patchBody.data.id = '00011122';

            const response = await agent
              .patch(`/${dit}s/00011122`)
              .send(patchBody)
              .expect(404);

            should(response.body).match({
              errors: [{
                status: 404,
                detail: `${dit} not found`
              }]
            });
          });
        });

        context('invalid', () => {
          it(`[invalid ${dit} id] 400`, async () => {
            patchBody.data.id = 'invalid-id';

            await agent
              .patch(`/${dit}s/invalid-id`)
              .send(patchBody)
              .expect(400);
          });

          it('[id in body doesn\'t equal id in params] 400', async () => {
            patchBody.data.id = '00011122';

            await agent
              .patch(`/${dit}s/${dit0.id}`)
              .send(patchBody)
              .expect(400);
          });

          it('[invalid title] 400', async () => {
            patchBody.data.attributes.title = '  ';

            await agent
              .patch(`/${dit}s/${dit0.id}`)
              .send(patchBody)
              .expect(400);
          });

          it('[invalid detail] 400', async () => {
            patchBody.data.attributes.detail = '.'.repeat(2049);

            await agent
              .patch(`/${dit}s/${dit0.id}`)
              .send(patchBody)
              .expect(400);
          });

          it('[not title nor detail (nothing to update)] 400', async () => {
            delete patchBody.data.attributes.title;
            delete patchBody.data.attributes.detail;

            await agent
              .patch(`/${dit}s/${dit0.id}`)
              .send(patchBody)
              .expect(400);
          });

          it('[unexpected attribute] 400', async () => {
            patchBody.data.attributes.foo = 'bar';

            await agent
              .patch(`/${dit}s/${dit0.id}`)
              .send(patchBody)
              .expect(400);
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          const response = await agent
            .patch(`/${dit}s/${dit0.id}`)
            .send(patchBody)
            .expect(403);

          // this should fail in authorization controller and not in dit controller
          should(response.body).not.match({
            errors: [{
              status: 403,
              detail: 'only creator can update'
            }]
          });
        });
      });
    });

    describe(`DELETE /${dit}s/:id`, () => {
      it('todo');
    });
  });
}