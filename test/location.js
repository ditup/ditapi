'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const app = require(path.resolve('./app')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const agent = supertest.agent(app);

let dbData;

describe('Location of people, tags, ideas, projects, ...', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    sandbox.useFakeTimers({
      toFake: ['Date']
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('PATCH location of a user', function () {

    let loggedUser, otherUser;

    beforeEach(async function () {
      const data = {
        users: 2, // how many users to make
        verifiedUsers: [0] // which users to make verified
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser, otherUser] = dbData.users;
    });

    afterEach(async function () {
      await dbHandle.clear();
    });


    it('ask for update every 3 months');

    context('logged in as me', function () {

      context('valid location', function () {

        it('save/update her location (latitude, longitude)', async function () {

          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: [13, 47.21]
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('preciseLocation', [13, 47.21]);
        });

        it('randomize the location (latitude, longitude)', async function () {

          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: [13, 47.21]
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('location').not.eql([13, 47.21]);
        });

        it('keep information about the last update time of the location', async function () {
          // try with a different time
          sandbox.clock.tick(10);

          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: [13, 47.21]
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('locationUpdated').eql(Date.now());
        });
      });

      context('invalid location', function () {
        it('[missing coordinates] error 400', async function () {

          await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: [0]
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });

        it('[bad data] error 400', async function () {

          await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: 'asdf'
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });

        it('[coordinates out of range] error 400', async function () {

          // check wrong latitude
          await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: [-90.1, 0]
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);

          // check wrong longitude
          await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: [0, 180.1]
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });
      });

      context('empty location', function () {
        it('remove the location from the user\'s profile', async function () {

          sandbox.clock.tick(1000);
          // set a location
          const set = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: [45, 45]
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(set.body.data.attributes).have.property('preciseLocation').deepEqual([45, 45]);
          should(set.body.data.attributes).have.property('locationUpdated').eql(Date.now());

          // wait a second
          sandbox.clock.tick(1000);

          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  location: null
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('location').eql(null);
          should(dt.attributes).have.property('preciseLocation').eql(null);
          should(dt.attributes).have.property('locationUpdated').eql(Date.now());
        });
      });
    });

    context('logged in as other user', function () {
      it('error 403', async function () {
        await agent
          .patch(`/users/${loggedUser.username}`)
          .send({
            data: {
              type: 'users',
              id: loggedUser.username,
              attributes: {
                location: [13, 47.21]
              }
            }
          })
          .set('Content-Type', 'application/vnd.api+json')
          .auth(otherUser.username, otherUser.password)
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(403);
      });
    });
  });

  describe('GET location of /users/:username', function () {
    it('the randomized location should be shown');
    it('non-randomized location shown only to self');
    it('deleted location shouldn\'t be shown');
  });

  describe('GET people within a rectangle', function () {

    let loggedUser;

    beforeEach(async function () {
      const data = {
        users: 10, // how many users to make
        verifiedUsers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // which users to make verified
        userLocations: {
          0: [0, 5],
          1: [1, 7],
          2: [-1, 10],
          3: [-1.0003, 15],
          4: [4.993, 4.99999],
          5: [-4.999, 15.01], // until here they should pass the 1st test
          6: [0, 0],
          7: [0, 15.2],
          8: [-5.2, 10],
          9: [5.2, 0],
        }
      };
      // create data in database
      dbData = await dbHandle.fill(data);

      [loggedUser] = dbData.users;
    });

    afterEach(async function () {
      await dbHandle.clear();
    });

    context('logged', function () {
      it('show people inside a specified rectangle and don\'t show people outside', async function () {
        const res = await agent
          .get('/users?filter[location]=-5.1,4.9,5.1,15.1')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(200);

        should(res).have.propertyByPath('body', 'data').length(6);
        should(res.body.data[0]).have.property('id').not.eql('undefined');
        should(res.body.data[0]).have.property('attributes').match({
          familyName: '',
          givenName: '',
          description: '',
          location: /.*/,
          username: /.*/
        });
      });

      it('limit the size of the rectangle');

      it('don\'t leak the preciseLocation', async function () {
        const res = await agent
          .get('/users?filter[location]=-5.1,4.9,5.1,15.1')
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(200);

        should(res).have.propertyByPath('body', 'data').length(6);

        should(res.body.data[0]).not.have.propertyByPath('attributes', 'preciseLocation');
      });

      context('invalid location', function () {
        it('[wrong corners] error with 400', async function () {
          await agent
            .get('/users?filter[location]=-5.1,15.1,5.1,4.9')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });

        it('[wrong amount of coordinates] error with 400', async function () {
          await agent
            .get('/users?filter[location]=-5,5,5,15,0')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });

        it('[out of range] error with 400', async () => {
          await agent
            .get('/users?filter[location]=-91,5,-80,15')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(400);
        });
      });

    });

    context('not logged in', function () {
      it('error with 403', async function () {
        await agent
          .get('/users?filter[location]=-1,-1,1,1')
          .set('Content-Type', 'application/vnd.api+json')
          .expect('Content-Type', /^application\/vnd\.api\+json/)
          .expect(403);
      });
    });

  });

  describe('GET people within a rectangle filtered by tags', function () {
    it('show people within a rectangle with a given tag');
  });

  describe('location of projects', function () {
    it('project can be geolocated');
  });

  describe('location of challenges, ideas', function () {
    it('show where are the people connected to the idea');
  });
});

/*
    context('logged in', function () {
      context('the edited user is the logged user', function () {
        // profile fields are givenName, familyName, description, birthday
        //
        it('should update 1 profile field', async function () {
          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes: {
                  givenName: 'new-given-name'
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('username', loggedUser.username);
          should(dt.attributes).have.property('givenName', 'new-given-name');
        });

        it('should update multiple profile fields', async function () {
          const attributes = {
            givenName: 'new-given-name',
            familyName: 'newFamily Name',
            description: 'this is a description'
          };

          const res = await agent
            .patch(`/users/${loggedUser.username}`)
            .send({
              data: {
                type: 'users',
                id: loggedUser.username,
                attributes
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect('Content-Type', /^application\/vnd\.api\+json/)
            .expect(200);

          should(res.body).have.property('data');
          const dt = res.body.data;
          should(dt).have.property('id', loggedUser.username);
          should(dt.attributes).have.property('username', loggedUser.username);
          should(dt.attributes).have.property('givenName', attributes.givenName);
          should(dt.attributes).have.property('familyName', attributes.familyName);
          should(dt.attributes).have.property('description', attributes.description);
        });
*/
