'use strict';

module.exports = {
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
  story: { $ref: 'sch#/definitions/userTag/story' },
  relevance: { $ref: 'sch#/definitions/userTag/relevance' },
  page: { $ref: 'sch#/definitions/query/page' },
  pageOffset0: { $ref: 'sch#/definitions/query/page0' }, // page with offset = 0
  random: { $ref: 'sch#/definitions/query/random' },
  tagsList: { $ref: 'sch#/definitions/query/tagsList' },
  ideaId: { $ref : 'sch#/definitions/idea/ideaId' },
  title: { $ref: 'sch#/definitions/idea/titl' },
  detail: { $ref: 'sch#/definitions/idea/detail' },
  content: { $ref: 'sch#/definitions/comment/content' },
  id: { $ref: 'sch#/definitions/shared/objectId' },
  voteValue: { $ref: 'sch#/definitions/vote/value' },
};
