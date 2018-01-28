'use strict';

const path = require('path');
const Serializer = require('jsonapi-serializer').Serializer;

const config = require(path.resolve('./config'));

/**
 * Serializer for ideaTags
 */
const ideaTagsSerializer = new Serializer('idea-tags', {
  attributes: ['idea', 'tag', 'creator'],
  typeForAttribute(attribute) {
    if (attribute === 'creator') {
      return 'users';
    }
  },
  // relationships
  idea: {
    ref: 'id',
    attributes: ['title', 'detail', 'created'],
    includedLinks: {
      self: ({ id }) => `${config.url.all}/ideas/${id}`
    }
  },
  tag: {
    ref: 'tagname',
    attributes: ['tagname'],
    includedLinks: {
      self: ({ tagname }) => `${config.url.all}/tags/${tagname}`
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
 * Given ideaTag, we generate id and add it to the ideaTag
 * This method mutates the parameter
 */
function createIdeaTagId(ideaTag) {
  const { idea: { id }, tag: { tagname } } = ideaTag;
  ideaTag.id = `${id}--${tagname}`;
}

/**
 * Function to serialize either a userTag or array of userTags
 */
function ideaTag(data) {
  // generate ids for ideaTags
  if (Array.isArray(data)) {
    data.forEach(createIdeaTagId);
  } else {
    createIdeaTagId(data);
  }

  // serialize
  return ideaTagsSerializer.serialize(data);
}

module.exports = { ideaTag };
