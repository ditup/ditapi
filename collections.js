'use strict';

/*
let uniqueEdge = {
  type: 'hash',
  fields: ['_from', '_to'],
  unique: true
};
*/

module.exports = {
  users: {
    type: 'document',
    indexes: [
      {
        type: 'hash',
        fields: ['username'],
        unique: true
      },
      {
        type: 'hash',
        fields: ['email'],
        unique: true,
        sparse: true
      },
      {
        type: 'geo',
        fields: ['location']
      }
    ]
  },

  tags: {
    type: 'document',
    indexes: [
      {
        type: 'hash',
        fields: ['tagname'],
        unique: true
      }
    ]
  },

  userTag: {
    type: 'edge',
    from: ['users'],
    to: ['tags'],
    indexes: [
      {
        type: 'hash',
        fields: ['_from', '_to'],
        unique: true
      }
    ]
  },

  messages: {
    type: 'edge',
    from: ['users'],
    to: ['users'],
    indexes: []
  },

  contacts: {
    type: 'edge',
    from: ['users'],
    to: ['users'],
    indexes: [
      {
        type: 'hash',
        fields: ['unique'],
        unique: true
      }
    ]
  },

  ideas: {
    type: 'document'
  },

  ideaTags: {
    type: 'edge',
    from: ['ideas'],
    to: ['tags'],
    indexes: [
      {
        type: 'hash',
        fields: ['_from', '_to'],
        unique: true
      }
    ]
  },

  comments: {
    type: 'document',
    indexes: [
      {
        type: 'hash',
        fields: ['primary']
      },
      {
        type: 'hash',
        fields: ['creator']
      }
    ]
  }

};

/*
{
  challengeCommentAuthor: {
    type: 'edge',
    from: ['challenges'],
    to: ['users']
  },
  challenges: {
    type: 'document'
  },
  challengeTag: {
    type: 'edge',
    from: ['challenges'],
    to: ['tags'],
    indexes: [
      uniqueEdge
    ]
  },
  discussionCommentAuthor: {
    type: 'edge',
    from: ['discussions'],
    to: ['users']
  },
  discussions: {
    type: 'document'
  },
  discussionTag: {
    type: 'edge',
    from: ['discussions'],
    to: ['tags'],
    indexes: [
      uniqueEdge
    ]
  },
  ideaCommentAuthor: {
    type: 'edge',
    from: ['ideas'],
    to: ['users']
  },
  ideas: {
    type: 'document'
  },
  ideaTag: {
    type: 'edge',
    from: ['ideas'],
    to: ['tags'],
    indexes: [
      uniqueEdge
    ]
  },
  projectCommentAuthor: {
    type: 'edge',
    from: ['projects'],
    to: ['users']
  },
  projectMember: {
    type: 'edge',
    from: ['projects'],
    to: ['users'],
    indexes: [
      uniqueEdge
    ]
  },
  projects: {
    type: 'document'
  },
  'projectTag': {
    'type': 'edge',
    'from': ['projects'],
    'to': ['tags'],
    indexes: [
      uniqueEdge
    ]
  },
  'tags': {
    'type': 'document',
    'unique': ['name', 'tagname']
  },
  'userFollowChallenge': {
    'type': 'edge',
    'unique': ['unique'],
    'from': ['users'],
    'to': ['challenges']
  },
  'userFollowDiscussion': {
    'type': 'edge',
    'unique': ['unique'],
    'from': ['users'],
    'to': ['discussions']
  },
  'userFollowIdea': {
    'type': 'edge',
    'unique': ['unique'],
    'from': ['users'],
    'to': ['ideas']
  },
  'userFollowProject': {
    'type': 'edge',
    'unique': ['unique'],
    'from': ['users'],
    'to': ['projects']
  },
  'userFollowUser': {
    'type': 'edge',
    'unique': ['unique'],
    'from': ['users'],
    'to': ['users']
  },
  'users': {
    'type': 'document',
    indexes: [
      {
        type: 'hash',
        fields: ['username'],
        unique: true
      },
      {
        type: 'hash',
        fields: ['email'],
        unique: true,
        sparse: true
      }
    ]
  },
  'userTag': {
    'type': 'edge',
    'unique': ['unique'],
    'from': ['users'],
    'to': ['tags']
  },
  'messages': {
    'type': 'edge',
    'unique': [],
    'from': ['users'],
    'to': ['users']
  },
  'notifications': {
    'type': 'document',
    'unique': [],
    'hash':['to']
  }
}
*/
