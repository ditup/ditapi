'use strict';

module.exports = {
  user: {
    username: {
      type: 'string',
      minLength: 2,
      maxLength: 32,
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
    },
    email: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$'
    },
    givenName: {
      type: 'string',
      maxLength: 128
    },
    familyName: {
      type: 'string',
      maxLength: 128
    },
    desc: { // description
      type: 'string',
      maxLength: 2048
    },
    password: {
      type: 'string',
      minLength: 10,
      maxLength: 512
    },
    location: {
      oneOf: [
        {
          type: 'null'
        },
        {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: [
            {
              type: 'number',
              minimum: -90,
              maximum: 90
            },
            {
              type: 'number',
              minimum: -180,
              maximum: 180
            }
          ]
        }
      ]
    },
    code: {
      type: 'string',
      pattern: '^[0-9a-f]{32}$'
    }
  },
  tag: {
    tagname: {
      type: 'string',
      minLength: 2,
      maxLength: 64,
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
    }
  },
  userTag: {
    story: {
      type: 'string',
      maxLength: 1024
    },
    relevance: {
      enum: [1, 2, 3, 4, 5]
    }
  },
  contact: {
    trust: {
      enum: [1, 2, 4, 8]
    },
    message: {
      type: 'string',
      maxLength: 2048
    },
    reference: {
      type: 'string',
      maxLength: 2048
    },
  },
  message: {
    body: {
      type: 'string',
      minLength: 1,
      maxLength: 2048,
      pattern: '\\S' // at least one non-space character
    },
    messageId: {
      type: 'string'
    }
  },
  query: {
    page: {
      properties: {
        offset: {
          type: 'number'
        },
        limit: {
          type: 'number',
          maximum: 20
        }
      },
      required: ['offset', 'limit'],
      additionalProperties: false
    },
    page0: {
      properties: {
        offset: {
          type: 'number',
          enum: [0]
        },
        limit: {
          type: 'number',
          maximum: 20
        }
      },
      required: ['offset', 'limit'],
      additionalProperties: false
    }
  }
};
