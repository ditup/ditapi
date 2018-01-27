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
  popularByUses: {
    properties: {
      query: {
        properties: {
          sort: {
            enum: ['-popularityByUses']
          }
        },
        required: ['sort']
      }
    },
    required: ['query']
  }
};
