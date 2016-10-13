/*
'use strict';

var frisby = require('frisby');

frisby.create('create user')
  .addHeader('Content-Type', 'application/vnd.api+json')
  .post('http://localhost:3000/api/users', {
    data: {
      type: 'users',
      attributes: {
        username: 'test',
        password: 'asdfasdf',
        email: 'test@example.com'
      }
    }
  }, {json: true})
  .expectStatus(201)
  .expectHeader('Location', 'http://localhost:3000/api/users/test')
  .expectHeader('content-type', 'application/vnd.api+json')
  .toss();
*/
