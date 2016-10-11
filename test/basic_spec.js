'use strict';

var frisby = require('frisby');

frisby.create('testing the test')
  .get('http://localhost:4000')
  .expectStatus(404)
  .expectHeaderContains('content-type', 'application/vnd.api+json')
  .toss();
