'use strict';

// library dependencies
const path = require('path'),
      should = require('should'),
      sinon = require('sinon');

// file dependencies
const agentFactory = require('./agent'),
      config = require(path.resolve('./config')),
      dbHandle = require('./handleDatabase');

describe('auth', () => {
  let agent,
      clock,
      data,
      sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    clock = sandbox.useFakeTimers({
      now: 12345000,
      toFake: ['Date']
    });

    agent = agentFactory();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('GET /auth/exp', () => {

    beforeEach(async () => {
      data = await dbHandle.fill({
        users: 1,
        verifiedUsers: [0]
      });

      // stub the config jwt token expiration time
      sandbox.stub( config.jwt, 'expirationTime').value(1000);
    });

    afterEach(async () => {
      await dbHandle.clear();
    });

    context('logged', () => {

      beforeEach(() => {
        agent = agentFactory.logged(data.users[0]);
      });

      it('return time till a token expiration in seconds', async () => {
        // wait 333 seconds
        clock.tick(333 * 1000);
        // time till expiration is 667 seconds

        const response = await agent
          .get('/auth/exp')
          .expect(200);

        should(response.body).deepEqual({
          meta: { exp: 667 }
        });
      });

      // also tests that expired token can't be used for authentication
      it('[expired] 403', async () => {
        // wait 999 seconds
        clock.tick(999 * 1000);
        await agent
          .get('/auth/exp')
          .expect(200);

        // wait till expiration
        clock.tick(1001);
        await agent
          .get('/auth/exp')
          .expect(403);
      });
    });

    context('not logged', () => {
      it('403', async () => {
        await agent
          .get('/auth/exp')
          .expect(403);
      });
    });
  });
});
