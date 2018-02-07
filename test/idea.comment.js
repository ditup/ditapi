'use strict';

const path = require('path'),
      should = require('should'),
      sinon = require('sinon');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

describe('comments of idea', () => {

  // declare some variables
  let agent,
      dbData,
      sandbox;

  // default (not logged) supertest agent
  beforeEach(() => {
    agent = agentFactory();
  });

  // clear database
  afterEach(async () => {
    await dbHandle.clear();
  });

  // sinon sandbox and set fake testing time
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers({
      now: 1500000000000,
      toFake: ['Date']
    });
  });

  // reset sinon sandbox
  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /ideas/:id/comments', () => {

    // declare variables
    let existentIdea,
        loggedUser,
        requestBody;

    // save testing data to database
    beforeEach(async () => {
      const data = {
        users: 3,
        verifiedUsers: [0, 1],
        ideas: Array(1).fill([])
      };

      dbData = await dbHandle.fill(data);

      existentIdea = dbData.ideas[0];
      loggedUser = dbData.users[0];
    });

    // create request body
    beforeEach(() => {
      requestBody = { data: {
        type: 'comments',
        attributes: {
          content: 'this is the idea comment.'
        }
      } };
    });

    context('logged in', () => {

      // log in supertest agent
      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid', () => {
        it('201 and create comment', async () => {
          // send the request
          const response = await agent
            .post(`/ideas/${existentIdea.id}/comments`)
            .send(requestBody)
            .expect(201);

          const commentId = response.body.data.id;

          // check that new comment is present in database
          const dbComment = await models.comment.read(commentId);
          should(dbComment).match({
            content: 'this is the idea comment.',
            id: commentId,
            creator: { username: loggedUser.username },
            primary: { type: 'ideas', id: existentIdea.id }
          });

          // check that the response body has a correct format
          should(response.body).match({
            data: {
              type: 'comments',
              id: commentId,
              attributes: {
                content: 'this is the idea comment.',
                created: Date.now()
              },
              relationships: {
                primary: {
                  data: {
                    type: 'ideas',
                    id: existentIdea.id
                  },
                },
                creator: {
                  data: {
                    type: 'users',
                    id: loggedUser.username
                  }
                }
              }
            }
          });
        });

        it('[nonexistent idea] 404', async () => {
          const response = await agent
            .post('/ideas/000111222/comments')
            .send(requestBody)
            .expect(404);

          should(response.body).deepEqual({
            errors: [{ status: 404, detail: 'primary document not found' }]
          });
        });
      });

      context('invalid', () => {

        it('[invalid idea id] 400', async () => {
          await agent
            .post('/ideas/invalid-id/comments')
            .send(requestBody)
            .expect(400);
        });

        it('[empty comment content] 400', async () => {
          requestBody.data.attributes.content = '   ';

          await agent
            .post(`/ideas/${existentIdea.id}/comments`)
            .send(requestBody)
            .expect(400);
        });

        it('[too long comment content] 400', async () => {
          requestBody.data.attributes.content = 'a'.repeat(1025);

          await agent
            .post(`/ideas/${existentIdea.id}/comments`)
            .send(requestBody)
            .expect(400);
        });

        it('[missing comment content] 400', async () => {
          delete requestBody.data.attributes.content;

          await agent
            .post(`/ideas/${existentIdea.id}/comments`)
            .send(requestBody)
            .expect(400);
        });

        it('[additional property] 400', async () => {
          requestBody.data.attributes.foo = 'bar';

          await agent
            .post(`/ideas/${existentIdea.id}/comments`)
            .send(requestBody)
            .expect(400);
        });

        it('[contains invalid html] strip invalid html and 201', async () => {
          requestBody.data.attributes.content = '<script>alert(\'hacked!\');</script>ok text<i>ok html</i>';

          const response = await agent
            .post(`/ideas/${existentIdea.id}/comments`)
            .send(requestBody)
            .expect(201);

          // check that the response body is correct
          // and invalid html is removed and valid html is kept
          should(response.body).propertyByPath('data', 'attributes', 'content')
            .eql('ok text<i>ok html</i>');
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent
          .post(`/ideas/${existentIdea.id}/comments`)
          .send(requestBody)
          .expect(403);
      });
    });
  });

  describe('GET /ideas/:id/comments', () => {
    it('todo');
  });

  describe('PATCH /comments/:id', () => {
    it('todo');
  });

  describe('DELETE /comments/:id', () => {
    it('todo');
  });

  describe('POST /comments/:id/reactions', () => {
    it('todo');
  });

  describe('GET /comments/:id/reactions', () => {
    it('todo');
  });

  describe('PATCH /reactions/:id', () => {
    it('todo');
  });

  describe('DELETE /reactions/:id', () => {
    it('todo');
  });

});
