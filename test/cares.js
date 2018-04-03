'use strict';

const path = require('path'),
      should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

describe('Expressing interest in ideas (caring about ideas).', () => {
  let agent,
      dbData,
      loggedUser;

  afterEach(async () => {
    await dbHandle.clear();
  });

  beforeEach(() => {
    agent = agentFactory();
  });

  describe('Start caring about idea `POST /ideas/:id/cares`', () => {

    let idea0;
    let requestBody;

    beforeEach(async () => {
      const data = {
        users: 1, // how many users to make
        verifiedUsers: [0], // which  users to make verified
        ideas: [[{}, 0]]
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      loggedUser = dbData.users[0];
      idea0 = dbData.ideas[0];
    });

    beforeEach(() => {
      requestBody = {
        data: {
          type: 'cares'
        }
      };
    });

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid request', () => {

        it('Success 201', async () => {
          const response = await agent.post(`/ideas/${idea0.id}/cares`)
            .send(requestBody)
            .expect(201);

          // saved into database?
          const dbCare = await models.care.read({ from: loggedUser.username, to: { type: 'ideas', id: idea0.id } });
          should(dbCare).ok();

          // correct response?
          should(response.body).match({
            data: {
              type: 'cares',
              relationships: {
                from: { data: { type: 'users', id: loggedUser.username } },
                to: { data: { type: 'ideas', id: idea0.id } }
              }
            }
          });
        });

        it('Duplicate 409', async () => {
          await agent.post(`/ideas/${idea0.id}/cares`)
            .send(requestBody)
            .expect(201);

          await agent.post(`/ideas/${idea0.id}/cares`)
            .send(requestBody)
            .expect(409);
        });

        it('Nonexistent idea 404', async () => {
          await agent.post('/ideas/11111111/cares')
            .send(requestBody)
            .expect(404);
        });
      });

      context('invalid request', () => {
        it('[invalid idea id] 400', async () => {
          await agent.post('/ideas/invalid--id/cares')
            .send(requestBody)
            .expect(400);
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent.post(`/ideas/${idea0.id}/cares`)
          .send(requestBody)
          .expect(403);
      });
    });
  });

  describe('Stop caring about idea `DELETE /ideas/:id/cares/care`', () => {
    context('logged', () => {
      context('valid', () => {
        it('[care exists] 204 and remove from database', async () => {

          // first care should exist
          const dbCareBefore = await models.care.read({ from: loggedUser.username, to: { type: 'ideas', id: idea0.id } });
          should(dbCareBefore).ok();

          await agent.delete(`/ideas/${idea0.id}/cares/care`)
            .expect(204);

          // then care shouldn't exist
          const dbCareAfter = await models.care.read({ from: loggedUser.username, to: { type: 'ideas', id: idea0.id } });
          should(dbCareAfter).not.ok();
        });

        it('[care doesn\'t exist] 404');
        it('[idea doesn\'t exist] 404');
      });
      
      context('invalid', () => {
        it('[invalid idea id] 400');
      });
    });

    context('not logged', () => {
      it('403');
    });
  });

  describe('See who cares about the idea `GET /ideas/:id/cares`', () => {
    it('todo');
  });

  describe('Include info whether I care about the idea when reading it', () => {
    it('todo');
  });

  describe('See ideas cared for by given user(s) `GET /ideas/:id?filter[caring]=username1,username2`', () => {
    it('todo');
  });

  describe('How many users care about the idea?', () => {
    it('todo');
  });
});
