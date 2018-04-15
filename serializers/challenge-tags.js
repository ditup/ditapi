'use strict';

const path = require('path');
const Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

/**
 * Serializer for challengeTags
 */
const challengeTagsSerializer = new Serializer('challenge-tags', {
  attributes: ['challenge', 'tag', 'creator'],
  typeForAttribute(attribute) {
    if (attribute === 'creator') {
      return 'users';
    }
  },
  // relationships
  challenge: {
    ref: 'id',
    attributes: ['title', 'detail', 'created'],
    includedLinks: {
      self: (data, { id }) => `${config.url.all}/challenges/${id}`
    }
  },
  tag: {
    ref: 'tagname',
    attributes: ['tagname'],
    includedLinks: {
      self: (data, { tagname }) => `${config.url.all}/tags/${tagname}`
    },
    relationshipLinks: { }
  },
  creator: {
    ref: 'username',
    attributes: ['username', 'givenName', 'familyName', 'description'],
    includedLinks: {
      self: (data, { username }) => `${config.url.all}/users/${username}`
    },
    relationshipLinks: {
      related: (data, { username }) => `${config.url.all}/users/${username}`
    }
  }
});

/**
 * Given challengeTag, we generate id and add it to the challengeTag
 * This method mutates the parameter
 */
function createChallengeTagId(challengeTag) {
  const { challenge: { id }, tag: { tagname } } = challengeTag;
  challengeTag.id = `${id}--${tagname}`;
}

/**
 * Function to serialize either a userTag or array of userTags
 */
function challengeTag(data) {
  // generate ids for challengeTags
  if (Array.isArray(data)) {
    data.forEach(createChallengeTagId);
  } else {
    createChallengeTagId(data);
  }

  // serialize
  return challengeTagsSerializer.serialize(data);
}

module.exports = { challengeTag };
