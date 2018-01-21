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
  },
  popularCount: {
    properties: {
      query: {
        properties: {
          sort: {
            enum: ['-popularCount']
          }
        },
        required: ['sort']
      }
    },
    required: ['query']
  }
};
