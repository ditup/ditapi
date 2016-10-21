'use strict';

describe('/users/:username/tags', function () {
  describe('GET', function () {
    it(`list of user's tags (may include user's story about the tag)`);
  });

  describe('POST', function () {
    it('add a tag to the user');
  });
});

describe('/users/:username/tags/:tagname', function () {
  describe('GET', function () {
    it(`show tag with user's relation to it`);
  });

  describe('PATCH', function () {
    it(`update user's relation to the tag`);
  });

  describe('DELETE', function () {
    it('delete tag from user');
  });
});
