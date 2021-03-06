'use strict';

const { title, detail, id, keywordsList, page, pageOffset0, random, tagsList, usersList } = require('./paths');
const postIdeas = {
  properties: {
    body: {
      properties: {
        title,
        detail
      },
      required: ['title', 'detail'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const getIdea = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    }
  },
  required: ['params']
};

const patchIdea = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    },
    body: {
      oneOf: [
        {
          properties: { title, detail, id },
          required: ['title', 'detail', 'id'],
          additionalProperties: false
        },
        {
          properties: { title, id },
          required: ['title', 'id'],
          additionalProperties: false
        },
        {
          properties: { detail, id },
          required: ['detail', 'id'],
          additionalProperties: false
        }
      ]
    }
  },
  required: ['body', 'params']
};

const getIdeasWithMyTags = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            withMyTags: {
              enum: ['']
            }
          },
          required: ['withMyTags'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getIdeasWithTags = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            withTags: tagsList
          },
          required: ['withTags'],
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

const getNewIdeas = {
  properties: {
    query: {
      properties: {
        sort: {
          enum: ['-created']
        },
        page
      },
      required: ['sort'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getRandomIdeas = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: { random },
          required: ['random'],
          additionalProperties: false
        },
        page: pageOffset0
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getIdeasWithCreators = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            creators: usersList
          },
          required: ['creators'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getIdeasCommentedBy = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            commentedBy: usersList
          },
          required: ['commentedBy'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getIdeasHighlyVoted = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            highlyVoted: {
              type: 'number'
            }
          },
          required: ['highlyVoted'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getIdeasTrending = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            trending: {
              type: 'string',
              enum: ['']
            }
          },
          required: ['trending'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

const getIdeasSearchTitle = {
  properties: {
    query: {
      properties: {
        filter: {
          properties: {
            title: {
              properties: {
                like: keywordsList
              },
              required: ['like'],
              additionalProperties: false
            }
          },
          required: ['title'],
          additionalProperties: false
        },
        page
      },
      required: ['filter'],
      additionalProperties: false
    },
  },
  required: ['query']
};

module.exports = { getIdea, getIdeasCommentedBy, getIdeasHighlyVoted, getIdeasSearchTitle, getIdeasTrending, getIdeasWithCreators, getIdeasWithMyTags, getIdeasWithTags, getNewIdeas, getRandomIdeas, patchIdea, postIdeas };
