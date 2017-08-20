'use strict';

const { username, givenName, familyName, description, location, tagname, page, page0 } = require('./paths');

const getUser = {
  id: 'getUser',
  properties: {
    params: {
      properties: {
        username
      }
    }
  }
};

const patchUser = {
  id: 'patchUser',
  properties: {
    params: {
      properties: {
        username
      }
    },
    body: {
      properties: {
        id: username,
        givenName,
        familyName,
        description,
        location
      },
      required: ['id'],
      additionalProperties: false
    }
  }
};

const getUsersWithMyTags = {
  id: 'getUsersWithMyTags',
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            byMyTags: {
              enum: ['']
            }
          },
          required: ['byMyTags']
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getUsersWithLocation = {
  id: 'getUsersWithLocation',
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            location: {
              type: 'array',
              items: location
            }
          },
          require: ['location']
        }
      },
      require: ['filter']
    }
  },
  require: ['query']
};

const postUsers = {
  id: 'postUsers',
  properties: {
    body: {
      properties: {
        email: {
          $ref : 'sch#/definitions/user/email'
        },
        username,
        password: { $ref: 'sch#/definitions/user/password'}
      },
      required: ['username', 'email', 'password']
    },
    required: ['body']
  }
};

const newUsers = {
  id: 'newUsers',
  properties: {
    query: {
      properties: {
        sort: {
          type: 'string'
        },
        page: page0
      },
      required: ['sort', 'page'],
      additionalProperties: false
    }
  }
};

const newUsersWithMyTags = {
  id: 'newUsersWithMyTags',
  properties: {
    query:{
      properties:{
        sort: {
          type: 'string',
          const: '-created'
        },
        filter: {
          properties: {
            withMyTags: {
              type: 'number',
            }
          },
          required: ['withMyTags'],
          additionalProperties: false
        },
        page: page0
      },
      required: ['sort', 'filter', 'page'],
      additionalProperties: false
    }
  },
  required: ['query']
};

const getUsersWithTags = {
  id: 'getUsersWithTags',
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            tag: {
              type: 'array',
              items: tagname,
              maxItems: 10,
              minItems: 1
            }
          },
          required: ['tag'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    }
  },
  required: ['query']
};


module.exports = {
  getUser,
  patchUser,
  postUsers,
  getUsersWithMyTags,
  getUsersWithTags,
  getUsersWithLocation,
  newUsers,
  newUsersWithMyTags
};
