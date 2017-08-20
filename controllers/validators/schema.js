'use strict';

const paths = {
  username: { $ref : 'sch#/definitions/user/username' },
  email: { $ref : 'sch#/definitions/user/email' },
  password: { $ref : 'sch#/definitions/user/password' },
  code: { $ref : 'sch#/definitions/user/code' },
  givenName: { $ref : 'sch#/definitions/user/givenName' },
  familyName: { $ref : 'sch#/definitions/user/familyName' },
  description: { $ref : 'sch#/definitions/user/desc' },
  location: { $ref : 'sch#/definitions/user/location' },
  tagname: { $ref : 'sch#/definitions/tag/tagname' },
  trust: { $ref : 'sch#/definitions/contact/trust' },
  contactMessage: { $ref : 'sch#/definitions/contact/message' },
  reference: { $ref : 'sch#/definitions/contact/reference' },
  messageBody: { $ref : 'sch#/definitions/message/body' },
  messageId: { $ref : 'sch#/definitions/message/messageId' },
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

const resetPassword = {
  id: 'resetPassword',
  properties: {
    body: {
      type: 'object',
      properties: {
        id: {
          anyOf: [paths.username, paths.email]
        }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const updateResetPassword = {
  id: 'updateResetPassword',
  properties: {
    body: {
      properties: {
        id: paths.username,
        code: paths.code,
        password: paths.password
      }
    }
  },
  required: ['body']
};

const updateUnverifiedEmail = {
  id: 'updateUnverifiedEmail',
  properties: {
    body: {
      properties: {
        email: paths.email,
        password: paths.password,
        id: paths.username
      },
      required: ['email', 'password', 'id'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const verifyEmail = {
  id: 'verifyEmail',
  properties: {
    body: {
      properties: {
        emailVerificationCode: paths.code,
        id: paths.username
      },
      required: ['emailVerificationCode', 'id'],
      additionalProperties: false // untested
    }
  },
  required: ['body']
};

const changePassword = {
  id: 'changePassword',
  properties: {
    body: {
      properties: {
        password: paths.password,
        oldPassword: {
          type: 'string',
          maxLength: 512
        },
        id: paths.username
      },
      required: ['password', 'oldPassword', 'id'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const postContacts = {
  id: 'postContacts',
  properties: {
    body: {
      properties: {
        trust: paths.trust,
        to: {
          properties: {
            username: paths.username
          },
          required: ['username']
        },
        message: paths.contactMessage,
        reference: paths.reference
      },
      required: ['trust', 'to'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const patchConfirmContact = {
  id: 'patchConfirmContacts',
  properties: {
    body: {
      properties: {
        trust: paths.trust,
        reference: paths.reference,
        isConfirmed: {
          enum: [true]
        },
        id: {}
      },
      required: ['id', 'isConfirmed', 'trust', 'reference'],
      additionalProperties: false
    },
    params: {
      properties: {
        from: paths.username,
        to: paths.username
      },
      required: ['from', 'to']
    }
  },
  required: ['body', 'params']
};

const patchUpdateContact = {
  id: 'patchUpdateContact',
  properties: {
    body: {
      properties: {
        trust: paths.trust,
        reference: paths.reference,
        message: paths.contactMessage,
        id: {}
      },
      additionalProperties: false
    }
  }
};

const getContact = {
  properties: {
    params: {
      properties: {
        from: paths.username,
        to: paths.username
      },
      required: ['from', 'to']
    }
  },
  required: ['params']
};

const postMessages = {
  properties: {
    body: {
      properties: {
        body: paths.messageBody,
        to: {
          properties: {
            username: paths.username
          },
          required: ['username']
        }
      },
      required: ['body', 'to']
    }
  }
};

const patchMessage = {
  properties: {
    body: {
      properties: {
        read: {
          enum: [true]
        },
        id: paths.messageId
      },
      required: ['id', 'read'],
      additionalProperties: false
    }
  },
  required: ['body']
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
        minLength: 8,
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
                type: 'integer'
              },
              offset: {
                type: 'integer'
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
                type: 'integer'
              },
              limit: {
                type: 'integer'
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
            additionalProperties: false
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
  postTags, getTag, getTagsRelatedToTags,
  resetPassword, updateResetPassword, updateUnverifiedEmail, verifyEmail, changePassword,
  postContacts, patchConfirmContact, patchUpdateContact, getContact,
  postMessages, patchMessage
};
