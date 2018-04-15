'use strict';

const { title, detail, ditType, id, keywordsList, page, pageOffset0, random, tagsList, usersList } = require('./paths');

const postChallenges = {
  properties: {
    body: {
      properties: {
        title,
        detail,
        ditType
      },
      required: ['title', 'detail', 'ditType'],
      additionalProperties: false
    }
  },
  required: ['body']
};

const getChallenge = {
  properties: {
    params: {
      properties: { id },
      required: ['id'],
      additionalProperties: false
    }
  },
  required: ['params']
};

const patchChallenge = {
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

const getChallengesWithMyTags = {
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

const getChallengesWithTags = {
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

const getNewChallenges = {
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

const getRandomChallenges = {
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

const getChallengesWithCreators = {
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

const getChallengesCommentedBy = {
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

const getChallengesHighlyVoted = {
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

const getChallengesTrending = {
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

const getChallengesSearchTitle = {
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

module.exports = { getChallenge, getChallengesCommentedBy, getChallengesHighlyVoted, getChallengesSearchTitle, getChallengesTrending, getChallengesWithCreators, getChallengesWithMyTags, getChallengesWithTags, getNewChallenges, getRandomChallenges, patchChallenge, postChallenges };
