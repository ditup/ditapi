'use strict';

const path = require('path'),
      Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

const ideaSerializer = new Serializer('ideas', {
  id: 'id',
  attributes: ['title', 'detail', 'created', 'creator', 'ideaTags'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'creator') {
      return 'users';
    }
    if (attribute === 'ideaTags') return 'idea-tags';
  },
  creator: {
    ref: 'username',
    type: 'users',
    attributes: ['username', 'givenName', 'familyName', 'description'],
    includedLinks: {
      self: (data, { username }) => `${config.url.all}/users/${username}`
    },
    relationshipLinks: {
      related: (data, { username }) => `${config.url.all}/users/${username}`
    }
  },
  // when we want to have ideaTags as relationships
  ideaTags: {
    ref: 'id',
    attributes: ['idea', 'tag', ''],
    typeForAttribute(attribute) {
      if (attribute === 'creator') {
        return 'users';
      }
    },
    relationshipLinks: { },
    includedLinks: { },
    // relationships
    idea: {
      ref: 'id'
    },
    tag: {
      ref: 'tagname'
    }
  },
  dataMeta: {
    votesUp(record, current) {
      if (!current.votes) return;
      return current.votes.filter(vote => vote.value === 1).length;
    },
    votesDown(record, current) {
      if (!current.votes) return;
      return current.votes.filter(vote => vote.value === -1).length;
    },
    myVote(record, current) {
      if (!current.hasOwnProperty('myVote')) return;
      return (current.myVote) ? current.myVote.value : 0;
    },
    voteSum(record, current) {
      return current.voteSum;
    }
  }
});

function idea(data) {
  return ideaSerializer.serialize(data);
}

module.exports = { idea };
