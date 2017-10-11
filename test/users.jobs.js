'use strict';

const path = require('path'),
      sinon = require('sinon'),
      should = require('should');


const userJobs = require(path.resolve('./jobs/users')),
      dbHandle = require(path.resolve('./test/handleDatabase')),
      config = require(path.resolve('./config')),
      models = require(path.resolve('./models'));

describe('User jobs', function () {
  let sandbox;

  describe('Delete unverified users after a time period', function () {
    const ttl = 1234567890;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      sandbox.useFakeTimers(1500000000000, 'Date');
      sandbox.stub(config, 'unverifiedUsersTTL').value(ttl);
    });

    afterEach(function () {
      sandbox.restore();
    });


    beforeEach(async function () {
      const data = {
        users: 5, // how many users to make
        verifiedUsers: [0, 2, 4]
      };

      // create data in database
      await dbHandle.fill(data);
    });

    // clear database after every test
    afterEach(async function () {
      await dbHandle.clear();
    });

    it('should delete unverified accounts which are older than the time period', async function () {
      should(await models.user.count({ verified: false })).eql(2);

      sandbox.clock.tick(ttl + 1);

      await userJobs.deleteUnverified();

      should(await models.user.count({ verified: false })).eql(0);
    });

    it('should not delete unverified accounts which are younger than the time period', async function () {
      should(await models.user.count({ verified: false })).eql(2);

      sandbox.clock.tick(ttl - 1);

      await userJobs.deleteUnverified();

      should(await models.user.count({ verified: false })).eql(2);
    });

    it('should not delete verified accounts', async function () {
      should(await models.user.count({ verified: true })).eql(3);

      sandbox.clock.tick(ttl + 1);

      const count = await userJobs.deleteUnverified();

      should(count).eql(2); // deleted only the 2 unverified users

      should(await models.user.count({ verified: true })).eql(3);
    });

  });
});
