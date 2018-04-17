'use strict';

const path = require('path'),
      Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

const challengeSerializer = new Serializer('challenges', {
  id: 'id',
  attributes: ['title', 'detail', 'created', 'creator', 'challengeTags'],
  keyForAttribute: 'camelCase',
  typeForAttribute(attribute) {
    if (attribute === 'creator') {
      return 'users';
    }
    if (attribute === 'challengeTags') return 'challenge-tags';
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
  // when we want to have challengeTags as relationships
  challengeTags: {
    ref: 'id',
    attributes: ['challenge', 'tag', ''],
    typeForAttribute(attribute) {
      if (attribute === 'creator') {
        return 'users';
      }
    },
    relationshipLinks: { },
    includedLinks: { },
    // relationships
    challenge: {
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

function challenge(data) {
  return challengeSerializer.serialize(data);
}

module.exports = { challenge };
