'use strict';

module.exports = {
  newQuery: {
    properties: {
      query: {
        properties: {
          sort: {
            enum: ['-created']
          }
        },
        required: ['sort']
      }
    },
    required: ['query']
  }
};
