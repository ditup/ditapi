'use strict';

const path = require('path'),
      should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

describe('ideas', () => {
  let agent,
      dbData,
      loggedUser;

  afterEach(async () => {
    await dbHandle.clear();
  });

  beforeEach(() => {
    agent = agentFactory();
  });

  describe('POST /ideas', () => {
    let newIdeaBody;

    beforeEach(() => {
      newIdeaBody = { data: {
        type: 'ideas',
        attributes: {
          title: 'A testing idea 1',
          detail: 'This is a testing idea detail.'
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

        it('should create idea and respond with 201', async () => {
          const response = await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          // respond with the new idea
          const newIdeaResponseBody = response.body;

          // is response body correct?
          should(newIdeaResponseBody).match({
            data: {
              type: 'ideas',
              attributes: {
                title: 'A testing idea 1',
                detail: 'This is a testing idea detail.',
                ditType: 'idea'
              }
            }
          });
          should(newIdeaResponseBody).have.propertyByPath('data', 'id');
          should(newIdeaResponseBody).have.propertyByPath('data', 'attributes', 'created');

          // is the new idea saved in database?
          const newIdeaDb = await models.idea.read(response.body.data.id);

          // does the idea id equal the idea key in database?
          should(newIdeaDb.id).eql(response.body.data.id);

          // data should contain creator as relationship
          should(newIdeaResponseBody)
            .have.propertyByPath('data', 'relationships', 'creator')
            .match({
              data: {
                type: 'users', id: loggedUser.username
              }
            });
        });

      });

      context('invalid data', () => {

        it('[empty idea title] 400', async () => {
          // invalid body
          newIdeaBody.data.attributes.title = '    ';

          await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[too long idea title] 400', async () => {
          // invalid body
          newIdeaBody.data.attributes.title = 'a'.repeat(257);

          await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[missing idea title] 400', async () => {
          // invalid body
          delete newIdeaBody.data.attributes.title;

          await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[too long idea detail] 400', async () => {
          // invalid body
          newIdeaBody.data.attributes.detail = 'a'.repeat(2049);

          await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[missing idea detail] 400', async () => {
          // invalid body
          delete newIdeaBody.data.attributes.detail;

          await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[unexpected property] 400', async () => {
          // invalid body
          newIdeaBody.data.attributes.unexpected = 'asdf';

          await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[XSS in body] sanitize', async () => {
          // body with XSS
          newIdeaBody.data.attributes.detail = `<script>alert('asdf')</script>
            <a href="javascript: alert('asdf')">foo</a>
            <i>italic</i>
            <a href="https://example.com">bar</a>
          `;
          const response = await agent
            .post('/ideas')
            .send(newIdeaBody)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          // respond with the new idea
          const newIdeaResponseBody = response.body;

          should(newIdeaResponseBody).have.propertyByPath('data', 'attributes', 'detail').eql(`<i>italic</i>
            <a href="https://example.com">bar</a>`);

        });
      });
    });

    context('not logged in', () => {
      it('should say 403 Forbidden', async () => {
        await agent
          .post('/ideas')
          .send(newIdeaBody)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });

  describe('GET /ideas/:id', () => {

    let idea;

    beforeEach(async () => {
      const data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        ideas: [[{}, 0]]
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      loggedUser = dbData.users[0];
      idea = dbData.ideas[0];
    });

    context('logged', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid', () => {
        it('[exists] read idea by id', async () => {
          const response = await agent
            .get(`/ideas/${idea.id}`)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).match({
            data: {
              type: 'ideas',
              id: idea.id,
              attributes: {
                title: idea.title,
                detail: idea.detail
              },
              relationships: {
                creator: {
                  data: { type: 'users', id: idea.creator.username }
                }
              }
            }
          });
        });

        it('[not exist] 404', async () => {
          await agent
            .get('/ideas/0013310')
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

      });

      context('invalid', () => {
        it('[invalid id] 400', async () => {
          await agent
            .get('/ideas/invalid-id')
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });
    });

    context('not logged', () => {
      it('403', async () => {
        await agent
          .get(`/ideas/${idea.id}`)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });

  describe('PATCH /ideas/:id', () => {

    let idea0,
        idea1,
        patchBody;

    beforeEach(async () => {
      const data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        ideas: [[{ }, 0], [{ }, 1]]
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      loggedUser = dbData.users[0];
      [idea0, idea1] = dbData.ideas;
    });

    beforeEach(() => {
      patchBody = {
        data: {
          type: 'ideas',
          id: idea0.id,
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
        it('[idea exists, creator, title] 200 and update in db', async () => {
          delete patchBody.data.attributes.detail;

          const { title } = patchBody.data.attributes;
          const { id, detail } = idea0;

          const response = await agent
            .patch(`/ideas/${id}`)
            .send(patchBody)
            .expect(200);

          should(response.body).match({
            data: {
              type: 'ideas',
              id,
              attributes: { title, detail }
            }
          });

          const ideaDb = await models.idea.read(idea0.id);

          should(ideaDb).match({ id, title, detail });
        });

        it('[idea exists, creator, detail] 200 and update in db', async () => {
          delete patchBody.data.attributes.title;

          const { detail } = patchBody.data.attributes;
          const { id, title } = idea0;

          const response = await agent
            .patch(`/ideas/${id}`)
            .send(patchBody)
            .expect(200);

          should(response.body).match({
            data: {
              type: 'ideas',
              id,
              attributes: { title, detail }
            }
          });

          const ideaDb = await models.idea.read(idea0.id);

          should(ideaDb).match({ id, title, detail });
        });

        it('[idea exists, creator, title, detail] 200 and update in db', async () => {
          const { title, detail } = patchBody.data.attributes;
          const { id } = idea0;

          const response = await agent
            .patch(`/ideas/${id}`)
            .send(patchBody)
            .expect(200);

          should(response.body).match({
            data: {
              type: 'ideas',
              id,
              attributes: { title, detail }
            }
          });

          const ideaDb = await models.idea.read(idea0.id);
          should(ideaDb).match({ id, title, detail });
        });

        it('[idea exists, not creator] 403', async () => {
          patchBody.data.id = idea1.id;

          const response = await agent
            .patch(`/ideas/${idea1.id}`)
            .send(patchBody)
            .expect(403);

          should(response.body).match({
            errors: [{
              status: 403,
              detail: 'only creator can update'
            }]
          });
        });

        it('[idea not exist] 404', async () => {
          patchBody.data.id = '00011122';

          const response = await agent
            .patch('/ideas/00011122')
            .send(patchBody)
            .expect(404);

          should(response.body).match({
            errors: [{
              status: 404,
              detail: 'idea not found'
            }]
          });
        });
      });

      context('invalid', () => {
        it('[invalid idea id] 400', async () => {
          patchBody.data.id = 'invalid-id';

          await agent
            .patch('/ideas/invalid-id')
            .send(patchBody)
            .expect(400);
        });

        it('[id in body doesn\'t equal id in params] 400', async () => {
          patchBody.data.id = '00011122';

          await agent
            .patch(`/ideas/${idea0.id}`)
            .send(patchBody)
            .expect(400);
        });

        it('[invalid title] 400', async () => {
          patchBody.data.attributes.title = '  ';

          await agent
            .patch(`/ideas/${idea0.id}`)
            .send(patchBody)
            .expect(400);
        });

        it('[invalid detail] 400', async () => {
          patchBody.data.attributes.detail = '.'.repeat(2049);

          await agent
            .patch(`/ideas/${idea0.id}`)
            .send(patchBody)
            .expect(400);
        });

        it('[not title nor detail (nothing to update)] 400', async () => {
          delete patchBody.data.attributes.title;
          delete patchBody.data.attributes.detail;

          await agent
            .patch(`/ideas/${idea0.id}`)
            .send(patchBody)
            .expect(400);
        });

        it('[unexpected attribute] 400', async () => {
          patchBody.data.attributes.foo = 'bar';

          await agent
            .patch(`/ideas/${idea0.id}`)
            .send(patchBody)
            .expect(400);
        });
      });
    });

    context('not logged', () => {
      it('403', async () => {
        const response = await agent
          .patch(`/ideas/${idea0.id}`)
          .send(patchBody)
          .expect(403);

        // this should fail in authorization controller and not in idea controller
        should(response.body).not.match({
          errors: [{
            status: 403,
            detail: 'only creator can update'
          }]
        });
      });
    });
  });

  describe('DELETE /ideas/:id', () => {
    it('todo');
  });
});
