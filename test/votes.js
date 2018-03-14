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
      idea0,
      idea1,
      loggedUser,
      otherUser;

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

    context('logged', () => {

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

    context('not logged', () => {
      it('403', async () => {
        await agent
          .post(`/ideas/${existentIdea.id}/votes`)
          .send(voteBody)
          .expect(403);
      });
    });
  });

  describe('DELETE /ideas/:id/votes/vote (remove a vote)', () => {

    beforeEach(async () => {
      const data = {
        users: 3, // how many users to make
        verifiedUsers: [0, 1, 2], // which  users to make verified
        ideas: [[{}, 0], [{}, 0]],
        votes: [
          [0, ['ideas', 0], -1],
          [1, ['ideas', 0], 1]
        ] // user, idea, value
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser, otherUser] = dbData.users;
      [idea0, idea1] = dbData.ideas;
    });

    context('logged', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid data', () => {
        it('[vote exists] remove the vote and 204', async () => {
          // first the vote should exist
          const dbVote = await models.vote.read({ from: loggedUser.username, to: { type: 'ideas', id: idea0.id } });
          should(dbVote).ok();

          // then we remove the vote
          await agent
            .delete(`/ideas/${idea0.id}/votes/vote`)
            .expect(204);

          // then the vote should not exist
          const dbVoteAfter = await models.vote.read({ from: loggedUser.username, to: { type: 'ideas', id: idea0.id } });
          should(dbVoteAfter).not.ok();
          // and other votes are still there
          const dbOtherVote = await models.vote.read({ from: otherUser.username, to: { type: 'ideas', id: idea0.id } });
          should(dbOtherVote).ok();
        });

        it('[vote doesn\'t exist] 404', async () => {
          await agent
            .delete(`/ideas/${idea1.id}/votes/vote`)
            .expect(404);
        });

        it('[idea doesn\'t exist] 404', async () => {
          await agent
            .delete('/ideas/111111/votes/vote')
            .expect(404);
        });
      });

      context('invalid data', () => {
        it('[invalid idea id] 400', async () => {
          await agent
            .delete('/ideas/invalid--id/votes/vote')
            .expect(400);
        });
      });
    });

    context('not logged', () => {
      it('403', async () => {
        await agent
          .delete(`/ideas/${idea0.id}/votes/vote`)
          .expect(403);
      });
    });
  });

  describe('PATCH /ideas/:id/votes/vote (change vote value)', () => {
    it('maybe todo');
  });

  describe('show amount of votes up and down and current user\'s vote when GET /ideas/:id', () => {

    beforeEach(async () => {
      const data = {
        users: 5, // how many users to make
        verifiedUsers: [0, 1, 2, 3, 4], // which  users to make verified
        ideas: [[{}, 0], [{}, 0]],
        votes: [
          [0, ['ideas', 0], -1],
          [1, ['ideas', 0], 1],
          [2, ['ideas', 0], 1],
          [2, ['ideas', 1], -1],
          [3, ['ideas', 0], -1],
          [4, ['ideas', 0], 1],
        ] // user, idea, value
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser, otherUser] = dbData.users;
      [idea0, idea1] = dbData.ideas;
    });

    beforeEach(() => {
      agent = agentFactory.logged(loggedUser);
    });

    it('show amount of votes up and down', async () => {
      const response = await agent
        .get(`/ideas/${idea0.id}`)
        .expect(200);

      should(response.body).match({
        data: {
          meta: {
            votesUp: 3,
            votesDown: 2
          }
        }
      });
    });

    it('show my vote', async () => {
      const response = await agent
        .get(`/ideas/${idea0.id}`)
        .expect(200);

      should(response.body).match({
        data: {
          meta: {
            myVote: -1
          }
        }
      });
    });

    it('show 0 as my vote if I didn\'t vote', async () => {
      const response = await agent
        .get(`/ideas/${idea1.id}`)
        .expect(200);

      should(response.body).match({
        data: {
          meta: {
            myVote: 0
          }
        }
      });
    });

  });
});
