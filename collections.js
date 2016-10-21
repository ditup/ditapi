'use strict';

let uniqueEdge = {
  type: 'hash',
  fields: ['_from', '_to'],
  unique: true
};

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

  tagCreator: {
    type: 'edge',
    from: ['tags'],
    to: ['users'],
    indexes: [
      {
        type: 'hash',
        fields: ['_from'],  // if multiple creators possible
        unique: true
      }
    ]
  },
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
