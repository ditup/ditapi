'use strict';

const path = require('path'),
      should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

describe('votes for ideas, ...', () => {
  let agent,
      dbData,
      existentIdea,
      loggedUser;

  afterEach(async () => {
    await dbHandle.clear();
  });

  beforeEach(() => {
    agent = agentFactory();
  });

  describe('POST /ideas/:id/votes (create a vote)', () => {
    let voteBody;

    beforeEach(() => {
      voteBody = { data: {
        type: 'votes',
        attributes: {
          value: -1
        }
      } };
    });

    // put pre-data into database
    beforeEach(async () => {
      const data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        ideas: [[{}, 0]]
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      loggedUser = dbData.users[0];
      existentIdea = dbData.ideas[0];
    });

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid data', () => {
        it('[all is fine] save the vote', async () => {
          const response = await agent
            .post(`/ideas/${existentIdea.id}/votes`)
            .send(voteBody)
            .expect(201);

          // saved into database?
          const dbVote = await models.vote.read({ from: loggedUser.username, to: { type: 'ideas', id: existentIdea.id } });
          should(dbVote).ok();

          // correct response?
          should(response.body).match({
            data: {
              type: 'votes',
              attributes: {
                value: -1
              },
              relationships: {
                from: { data: { type: 'users', id: loggedUser.username } },
                to: { data: { type: 'ideas', id: existentIdea.id } }
              }
            }
          });
        });

        it('[a vote already exists] 409', async () => {
          await agent
            .post(`/ideas/${existentIdea.id}/votes`)
            .send(voteBody)
            .expect(201);

          voteBody.data.attributes.value = 1;

          await agent
            .post(`/ideas/${existentIdea.id}/votes`)
            .send(voteBody)
            .expect(409);
        });

        it('[idea doesn\'t exist] 404', async () => {
          await agent
            .post('/ideas/1111111/votes')
            .send(voteBody)
            .expect(404);
        });
      });

      context('invalid data', () => {
        it('[not +1 or -1] 400', async () => {
          voteBody.data.attributes.value = 0;

          await agent
            .post(`/ideas/${existentIdea.id}/votes`)
            .send(voteBody)
            .expect(400);
        });

        it('[missing value in body] 400', async () => {
          delete voteBody.data.attributes.value;

          await agent
            .post(`/ideas/${existentIdea.id}/votes`)
            .send(voteBody)
            .expect(400);
        });

        it('[additional body parameters] 400', async () => {
          voteBody.data.attributes.foo = 'bar';

          await agent
            .post(`/ideas/${existentIdea.id}/votes`)
            .send(voteBody)
            .expect(400);
        });

        it('[invalid idea id] 400', async () => {
          await agent
            .post('/ideas/invalid--id/votes')
            .send(voteBody)
            .expect(400);
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent
          .post(`/ideas/${existentIdea.id}/votes`)
          .send(voteBody)
          .expect(403);
      });
    });
  });

  describe('DELETE /ideas/:id/votes/vote (remove a vote)', () => {
    context('logged', () => {
      context('valid data', () => {
        it('[vote exists] remove the vote and 204');

        it('[vote doesn\'t exist] 404');

        it('[idea doesn\'t exist] 404');
      });

      context('invalid data', () => {
        it('[invalid idea id] 400');
      });
    });

    context('not logged', () => {
      it('403');
    });
  });

  describe('PATCH /ideas/:id/votes/vote (change vote value)', () => {

  });

  describe('show amount of votes up and down and current user\'s vote when GET /ideas/:id', () => {

  });
});
