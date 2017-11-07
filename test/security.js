'use strict';

const agentFactory = require('./agent');

describe('Security', () => {
  let agent;

  beforeEach(() => {
    agent = agentFactory();
  });

  describe('Restrict http methods', () => {
    it('[unsupported method] should respond with 405', async () => {
      await agent
        .put('/users/:username')
        .send({ })
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
        .expect(406)
        .expect('Content-Type', /^application\/vnd\.api\+json/);
    });
  });

  describe('Validate request Accept header', () => {
    it('[request Accept header not contain application/vnd.api+json] 406', async() => {
      await agent
        .get('/users/username')
        .set('Accept', 'application/json, */*')
        .expect(406)
        .expect('Content-Type', /^application\/vnd\.api\+json/);
    });

    it('[request Accept header contains application/vnd.api+json] not 406', async() => {
      await agent
        .get('/users/username')
        .expect(404)
        .expect('Content-Type', /^application\/vnd\.api\+json/);
    });

    it('[exception: GET /users/:username/avatar] should contain image/jpeg and image/svg+xml', async () => {
      // negative check
      await agent
        .get('/users/username/avatar')
        .expect(406)
        .expect('Content-Type', /^application\/vnd\.api\+json/);

      // positive check
      await agent
        .get('/users/username/avatar')
        .set('Accept', 'image/jpeg, image/svg+xml, */*')
        .expect(403)
        .expect('Content-Type', /^application\/vnd\.api\+json/);
    });

  });

  describe('Security headers in response', () => {
    it('every response should contain security headers', async() => {
      await agent
        .get('/users/username')
        .expect('Content-Type', 'application/vnd.api+json')
        .expect('X-Content-Type-Options', 'nosniff')
        .expect('X-Frame-Options', 'DENY');

      // TODO test CORS headers
    });
  });
});
