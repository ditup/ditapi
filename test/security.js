'use strict';

const agent = require('./agent');

describe('Security', () => {
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
        .set('Accept', 'application/vnd.api+json, */*')
        .expect(404)
        .expect('Content-Type', /^application\/vnd\.api\+json/);
    });

    it('[exception: GET /users/:username/avatar] should contain image/jpeg and image/svg+xml', async () => {
      // negative check
      await agent
        .get('/users/username/avatar')
        .set('Accept', 'application/vnd.api+json, */*')
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
});
