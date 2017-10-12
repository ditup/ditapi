'use strict';

const supertest = require('supertest'),
      path = require('path');

const app = require(path.resolve('./app'));

const agent = supertest.agent(app);

describe('Security', () => {
  describe('Restrict http methods', () => {
    it('[unsupported method] should respond with 405', async () => {
      await agent
        .put('/users/:username')
        .send({ })
        .set('Content-Type', 'application/vnd.api+json')
        .expect(405)
        .expect('Content-Type', /^application\/vnd\.api\+json/);
    });
  });

  describe('Validate request content types', () => {
    it('[request has not content-type: application/vnd.api+json] should respond 406 Unacceptable', async () => {
      await agent
        .get('/users/username')
        .set('Content-Type', 'application/json')
        .expect(406)
        .expect('Content-Type', /^application\/vnd\.api\+json/);
    });

    it('[exception: PATCH /users/:username/avatar should have multipart/form-data]', async () => {
      await agent
        .patch('/users/username/avatar')
        .send({ })
        .set('Content-Type', 'application/vnd.api+json')
        .expect(406);
    });
  });
});
