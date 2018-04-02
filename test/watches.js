'use strict';

const path = require('path'),
      should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

describe('Watch ideas.', () => {
  let agent,
      dbData,
      loggedUser;

  afterEach(async () => {
    await dbHandle.clear();
  });

  beforeEach(() => {
    agent = agentFactory();
  });

  describe('Start watching idea `POST /ideas/:id/watches`', () => {

    let idea0;

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

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid request', () => {

        it('Success 201', async () => {
          const response = await agent.post(`/ideas/${idea0.id}/watches`)
            .send({
              data: {
                type: 'watches'
              }
            })
            .expect(201);

          // saved into database?
          const dbWatch = await models.watch.read({ from: loggedUser.username, to: { type: 'ideas', id: idea0.id } });
          should(dbWatch).ok();

          // correct response?
          should(response.body).match({
            data: {
              type: 'watches',
              relationships: {
                from: { data: { type: 'users', id: loggedUser.username } },
                to: { data: { type: 'ideas', id: idea0.id } }
              }
            }
          });
        });

        it('Duplicate 409');
        it('Nonexistent idea 404');
      });

      context('invalid request', () => {
        it('invalid idea id');
      });
    });
  });

  describe('Stop watching idea `DELETE /ideas/:id/watches/watch`', () => {
    it('todo');
  });

  describe('See who watches the idea `GET /ideas/:id/watches`', () => {
    it('todo');
  });

  describe('Include info whether I watch the idea when reading it', () => {
    it('todo');
  });

  describe('See ideas watched by given user(s) `GET /ideas/:id?filter[watchedBy]=username1,username2`', () => {
    it('todo');
  });

  describe('How many users watch the idea?', () => {
    it('todo');
  });
});
