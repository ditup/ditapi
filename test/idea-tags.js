'use strict';

const path = require('path'),
      should = require('should');

const dbHandle = require('./handle-database');
const agentFactory = require('./agent');
const models = require(path.resolve('./models'));

describe('tags of idea', () => {

  let agent,
      dbData,
      existentIdea,
      loggedUser,
      otherUser,
      tag0;

  beforeEach(() => {
    agent = agentFactory();
  });

  beforeEach(async () => {
    const data = {
      users: 3, // how many users to make
      verifiedUsers: [0, 1], // which  users to make verified
      tags: 2,
      ideas: [
        [{ }, 0]
      ]
    };
    // create data in database
    dbData = await dbHandle.fill(data);

    [loggedUser, otherUser] = dbData.users;
    [existentIdea] = dbData.ideas;
    [tag0] = dbData.tags;
  });

  afterEach(async () => {
    await dbHandle.clear();
  });

  describe('POST /ideas/:id/tags', () => {
    let postBody;

    beforeEach(() => {
      postBody = { data: {
        type: 'idea-tags',
        relationships: {
          tag: { data: { type: 'tags', id: tag0.tagname } }
        }
      } };
    });

    context('logged as idea creator', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid data', () => {
        it('[idea and tag exist and ideaTag doesn\'t] 201', async () => {
          const response = await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(201);

          const ideaTagDb = await models.ideaTag.read(existentIdea.id, tag0.tagname);
          should(ideaTagDb).match({
            idea: { id: existentIdea.id },
            tag: { tagname: tag0.tagname },
            creator: { username: loggedUser.username }
          });

          should(response.body).match({
            data: {
              type: 'idea-tags',
              id: `${existentIdea.id}--${tag0.tagname}`,
              relationships: {
                idea: { data: { type: 'ideas', id: existentIdea.id } },
                tag: { data: { type: 'tags', id: tag0.tagname } },
                creator: { data: { type: 'users', id: loggedUser.username } }
              }
            }
          });
        });

        it('[duplicate ideaTag] 409', async () => {
          // first it's ok
          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(201);

          // duplicate request should error
          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(409);
        });

        it('[idea doesn\'t exist] 404', async () => {
          const response = await agent
            .post('/ideas/00000000/tags')
            .send(postBody)
            .expect(404);

          should(response.body).deepEqual({
            errors: [{
              status: 404,
              detail: 'idea not found'
            }]
          });
        });

        it('[tag doesn\'t exist] 404', async () => {
          // set nonexistent tag in body
          postBody.data.relationships.tag.data.id = 'nonexistent-tag';

          const response = await agent
            .post(`/ideas/${existentIdea.id}/tags`)
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
            .post('/ideas/invalid-id/tags')
            .send(postBody)
            .expect(400);
        });

        it('[invalid tagname] 400', async () => {
          // invalidate tagname
          postBody.data.relationships.tag.data.id = 'invalidTagname';

          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(400);
        });

        it('[missing tagname] 400', async () => {
          // invalidate tagname
          delete postBody.data.relationships.tag;

          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(400);
        });

        it('[additional properties in body] 400', async () => {
          // add some attributes (or relationships)
          postBody.data.attributes = { foo: 'bar' };

          await agent
            .post(`/ideas/${existentIdea.id}/tags`)
            .send(postBody)
            .expect(400);
        });
      });

    });

    context('logged, not idea creator', () => {
      beforeEach(() => {
        agent = agentFactory.logged(otherUser);
      });

      it('403', async () => {
        const response = await agent
          .post(`/ideas/${existentIdea.id}/tags`)
          .send(postBody)
          .expect(403);

        should(response.body).deepEqual({
          errors: [{ status: 403, detail: 'not logged in as idea creator' }]
        });
      });
    });

    context('not logged', () => {
      it('403', async () => {
        await agent
          .post(`/ideas/${existentIdea.id}/tags`)
          .send(postBody)
          .expect(403);
      });
    });
  });

  describe('GET /ideas/:id/tags', () => {
    context('logged', () => {
      context('valid data', () => {
        it('[idea exists] 200 and list of idea-tags');
        it('[idea doesn\'t exist] 404');
      });

      context('invalid data', () => {
        it('[invalid id] 400');
      });

    });

    context('not logged', () => {
      it('403');
    });

  });

  describe('DELETE /ideas/:id/tags/:tagname', () => {

    context('logged as idea creator', () => {
      context('valid data', () => {
        it('[idea-tag exists] 204');
        it('[idea-tag doesn\'t exist] 404');
      });

      context('invalid data', () => {
        it('[invalid id] 400');
        it('[invalid tagname] 400');
      });

    });

    context('logged, not idea creator', () => {
      it('403');
    });

    context('not logged', () => {
      it('403');
    });

  });
});
