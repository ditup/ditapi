const paths = {
  username: { $ref : 'sch#/definitions/user/username' },
  givenName: { $ref : 'sch#/definitions/user/givenName' },
  familyName: { $ref : 'sch#/definitions/user/familyName' },
  description: { $ref : 'sch#/definitions/user/desc' },
  location: { $ref : 'sch#/definitions/user/location' },
  tagname: { $ref : 'sch#/definitions/tag/tagname' },
};

const getUser = {
  id: 'getUser',
  properties: {
    params: {
      properties: {
        username: paths.username
      }
    }
  }
};

const patchUser = {
  id: 'patchUser',
  properties: {
    params: {
      properties: {
        username: paths.username
      }
    },
    body: {
      properties: {
        id: paths.username,
        givenName: paths.givenName,
        familyName: paths.familyName,
        description: paths.description,
        location: paths.location
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
        }
      },
      required: ['filter']
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
              items: paths.location
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

const postTags = {
  id: 'postTags',
  properties: {
    body: {
      properties: {
        tagname: paths.tagname
      },
      required: ['tagname'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const getTag = {
  id: 'getTag',
  properties: {
    params: {
      properties: {
        tagname: paths.tagname
      },
      required: ['tagname'],
      additionalProperties: false
    }
  },
  required: ['params']
};

const getTagsRelatedToTags = {
  id: 'getTagsRelatedToTags',
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            relatedToTags: {
              type: 'array',
              items: paths.tagname
            }
          },
          required: ['relatedToTags']
        }
      },
      required: ['filter']
    }
  },
  required: ['query']
};

module.exports = {
  definitions: {
    user: {
      username: {
        type: 'string',
        pattern: '^(?=.{2,32}$)[a-z0-9]+([\\_\\-\\.][a-z0-9]+)*$'
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
        maxLength: 512,
        minLength: 8
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
        minLength: 1,
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
    }
  },
  postUsers: {
    id: 'postUsers',
    properties: {
      body: {
        properties: {
          email: {
            $ref : 'sch#/definitions/user/email'
          },
          username: paths.username,
          password: { $ref: 'sch#/definitions/user/password'}
        },
        required: ['username', 'email', 'password']
      },
      required: ['body']
    }
  },
  newUsers: {
    id: 'newUsers',
    properties: {
      query: {
        properties: {
          sort: {
            type: 'string'
          },
          page: {
            type: 'object',
            properties: {
              limit: {
                type: 'number'
              },
              offset: {
                type: 'number'
              }
            },
            required: ['limit', 'offset'],
            additionalProperties: false
          }
        },
        required: ['sort', 'page'],
        additionalProperties: false
      }
    }
  },
  newUsersWithMyTags: {
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
          page: {
            properties: {
              offset: {
                type: 'number'
              },
              limit: {
                type: 'number'
              }
            },
            required: ['offset', 'limit'],
            additionalProperties: false
          }
        },
        required: ['sort', 'filter', 'page'],
        additionalProperties: false
      }
    },
    required: ['query']
  },
  getUsersWithTags: {
    id: 'getUsersWithTags',
    properties: {
      query: {
        properties: {
          filter: {
            properties: {
              tag: {
                type: 'array',
                items: paths.tagname
              }
            },
            required: ['tag'],
            additionalProperties : false
          }
        },
        required: ['filter'],
        additionalProperties: false
      }
    },
    required: ['query']
  },
  postUserTags: {
    id: 'postUserTags',
    properties: {
      body: {
        properties: {
          tag: {
            properties: {
              tagname: paths.tagname
            }
          },
          story: { $ref: 'sch#/definitions/userTag/story' },
          relevance: { $ref: 'sch#/definitions/userTag/relevance' }
        },
        additionalProperties: false,
        required: ['tag', 'story', 'relevance']
      }
    },
    required: ['body']
  },
  patchUserTag: {
    id: 'patchUserTag',
    properties: {
      body: {
        properties: {
          story: { $ref: 'sch#/definitions/userTag/story' },
          relevance: { $ref: 'sch#/definitions/userTag/relevance' },
          id: {}
        },
        additionalProperties: false,
        required: ['id']
      },
      params: {
        properties: {
          tagname: paths.tagname
        }
      }
    },
    required: ['body', 'params']
  },
  getUser, patchUser, getUsersWithMyTags, getUsersWithLocation,
  postTags, getTag, getTagsRelatedToTags
};
