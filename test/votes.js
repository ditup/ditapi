'use strict';

const path = require('path'),
      should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

voteTestFactory('idea');
voteTestFactory('comment');

/**
 * We can test votes to different objects.
 * @param {string} primary - what is the object we vote for? i.e. comment, idea
 * @param {boolean} [only=false] - should we run only these tests or not? (describe vs. describe.only in mocha)
 */
function voteTestFactory(primary, only=false) {
  const primarys = primary + 's';

  const ds = (only) ? describe.only : describe;

  function fillPrimary(data, count) {
    switch (primary) {
      case 'comment':
        data.ideas = Array(1).fill([]);
        data.ideaComments = Array(count).fill([0, 0]);
        break;

      default:
        data[primarys] = Array(count).fill([{}, 0]);
    }
  }

  ds(`votes for ${primarys}, ...`, () => {
    let agent,
        dbData,
        existentPrimary,
        primary0,
        primary1,
        loggedUser,
        otherUser;

    afterEach(async () => {
      await dbHandle.clear();
    });

    beforeEach(() => {
      agent = agentFactory();
    });

    describe(`POST /${primarys}/:id/votes (create a vote)`, () => {
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
        };

        fillPrimary(data, 1);

        // create data in database
        dbData = await dbHandle.fill(data);

        loggedUser = dbData.users[0];
        existentPrimary = dbData[primarys][0];
      });

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', () => {
          it('[all is fine] save the vote', async () => {
            const response = await agent
              .post(`/${primarys}/${existentPrimary.id}/votes`)
              .send(voteBody)
              .expect(201);

            // saved into database?
            const dbVote = await models.vote.read({ from: loggedUser.username, to: { type: primarys, id: existentPrimary.id } });
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
                  to: { data: { type: primarys, id: existentPrimary.id } }
                }
              }
            });
          });

          it('[a vote already exists] 409', async () => {
            await agent
              .post(`/${primarys}/${existentPrimary.id}/votes`)
              .send(voteBody)
              .expect(201);

            voteBody.data.attributes.value = 1;

            const response = await agent
              .post(`/${primarys}/${existentPrimary.id}/votes`)
              .send(voteBody)
              .expect(409);

            should(response.body).deepEqual({
              errors: [{
                status: 409,
                detail: 'duplicate vote'
              }]
            });
          });

          it(`[${primary} doesn't exist] 404`, async () => {
            const response = await agent
              .post(`/${primarys}/1111111/votes`)
              .send(voteBody)
              .expect(404);

            should(response.body).deepEqual({
              errors: [{
                status: 404,
                detail: `${primary} doesn't exist`
              }]
            });
          });
        });

        context('invalid data', () => {
          it('[not +1 or -1] 400', async () => {
            voteBody.data.attributes.value = 0;

            await agent
              .post(`/${primarys}/${existentPrimary.id}/votes`)
              .send(voteBody)
              .expect(400);
          });

          it('[missing value in body] 400', async () => {
            delete voteBody.data.attributes.value;

            await agent
              .post(`/${primarys}/${existentPrimary.id}/votes`)
              .send(voteBody)
              .expect(400);
          });

          it('[additional body parameters] 400', async () => {
            voteBody.data.attributes.foo = 'bar';

            await agent
              .post(`/${primarys}/${existentPrimary.id}/votes`)
              .send(voteBody)
              .expect(400);
          });

          it(`[invalid ${primary} id] 400`, async () => {
            await agent
              .post(`/${primarys}/invalid--id/votes`)
              .send(voteBody)
              .expect(400);
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          await agent
            .post(`/${primarys}/${existentPrimary.id}/votes`)
            .send(voteBody)
            .expect(403);
        });
      });
    });

    describe(`DELETE /${primarys}/:id/votes/vote (remove a vote)`, () => {

      beforeEach(async () => {
        const data = {
          users: 3, // how many users to make
          verifiedUsers: [0, 1, 2], // which  users to make verified
          votes: [
            [0, [primarys, 0], -1],
            [1, [primarys, 0], 1]
          ] // user, primary, value
        };

        fillPrimary(data, 2);

        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser, otherUser] = dbData.users;
        [primary0, primary1] = dbData[primarys];
      });

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid data', () => {
          it('[vote exists] remove the vote and 204', async () => {
            // first the vote should exist
            const dbVote = await models.vote.read({ from: loggedUser.username, to: { type: primarys, id: primary0.id } });
            should(dbVote).ok();

            // then we remove the vote
            await agent
              .delete(`/${primarys}/${primary0.id}/votes/vote`)
              .expect(204);

            // then the vote should not exist
            const dbVoteAfter = await models.vote.read({ from: loggedUser.username, to: { type: primarys, id: primary0.id } });
            should(dbVoteAfter).not.ok();
            // and other votes are still there
            const dbOtherVote = await models.vote.read({ from: otherUser.username, to: { type: primarys, id: primary0.id } });
            should(dbOtherVote).ok();
          });

          it('[vote doesn\'t exist] 404', async () => {
            const response = await agent
              .delete(`/${primarys}/${primary1.id}/votes/vote`)
              .expect(404);

            should(response.body).deepEqual({
              errors: [{
                status: 404,
                detail: `vote or ${primary} doesn't exist`
              }]
            });

          });

          it(`[${primary} doesn't exist] 404`, async () => {
            const response = await agent
              .delete(`/${primarys}/111111/votes/vote`)
              .expect(404);

            should(response.body).deepEqual({
              errors: [{
                status: 404,
                detail: `vote or ${primary} doesn't exist`
              }]
            });
          });
        });

        context('invalid data', () => {
          it(`[invalid ${primary} id] 400`, async () => {
            await agent
              .delete(`/${primarys}/invalid--id/votes/vote`)
              .expect(400);
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          await agent
            .delete(`/${primarys}/${primary0.id}/votes/vote`)
            .expect(403);
        });
      });
    });

    describe(`PATCH /${primarys}/:id/votes/vote (change vote value)`, () => {
      it('maybe todo');
    });

    describe(`show amount of votes up and down and current user\`s vote when GET /${primarys}${(primary === 'comment') ? '' : '/:id'}`, () => {

      let idea0,
          url;

      beforeEach(async () => {
        const data = {
          users: 5, // how many users to make
          verifiedUsers: [0, 1, 2, 3, 4], // which  users to make verified
          votes: [
            [0, [primarys, 0], -1],
            [1, [primarys, 0], 1],
            [2, [primarys, 0], 1],
            [2, [primarys, 1], -1],
            [3, [primarys, 0], -1],
            [4, [primarys, 0], 1],
          ] // user, primary, value
        };

        fillPrimary(data, 2);

        // create data in database
        dbData = await dbHandle.fill(data);

        [loggedUser, otherUser] = dbData.users;
        [primary0, primary1] = dbData[primarys];
        [idea0] = dbData.ideas;
      });

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      beforeEach(() => {
        url = (primary === 'comment') ? `/ideas/${idea0.id}/comments` : `/${primarys}/${primary0.id}`;
      });

      it('show amount of votes up and down', async () => {
        const response = await agent
          .get(url)
          .expect(200);

        const objectToTest = (primary === 'comment') ? response.body.data[0] : response.body.data;

        should(objectToTest).match({ meta: { votesUp: 3, votesDown: 2 } });
      });

      it('show my vote', async () => {
        const response = await agent
          .get(url)
          .expect(200);

        const objectToTest = (primary === 'comment') ? response.body.data[0] : response.body.data;

        should(objectToTest).match({ meta: { myVote: -1 } });
      });

      it('show 0 as my vote if I didn\'t vote', async () => {
        const url2 = (primary === 'comment') ? `/ideas/${idea0.id}/comments` : `/${primarys}/${primary1.id}`;

        const response = await agent
          .get(url2)
          .expect(200);

        const objectToTest = (primary === 'comment') ? response.body.data[1] : response.body.data;

        should(objectToTest).match({ meta: { myVote: 0 } });
      });
    });

  });
}
