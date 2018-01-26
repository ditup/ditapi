'use strict';

const path = require('path'),
      should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

describe('/ideas', () => {
  let agent,
      dbData,
      loggedUser;

  afterEach(async () => {
    await dbHandle.clear();
  });

  describe('POST', () => {
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
                detail: 'This is a testing idea detail.'
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
      beforeEach(() => {
        agent = agentFactory();
      });

      it('should say 403 Forbidden', async () => {
        await agent
          .post('/ideas')
          .send(newIdeaBody)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });
});
