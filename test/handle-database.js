'use strict';

/*
 * Create testing data for database
 *
 *
 */

const path = require('path'),
      _ = require('lodash');

const models = require(path.resolve('./models'));

exports.fill = async function (data) {
  const def = {
    users: 0,
    verifiedUsers: [],
    userLocations: {},
    tags: 0,
    namedTags: [],
    userTag: [],
    messages: [],
    contacts: [],
    ideas: [],
    ideaTags: [],
    ideaComments: [],
    reactions: [],
    votes: [],
    cares: []
  };

  data = _.defaults(data, def);

  const processed = processData(data);

  for(const user of processed.users) {
    await models.user.create(_.pick(user, ['username', 'email', 'password']));

    // verify emails of verified users
    if (user.verified === true)
      await models.user.finalVerifyEmail(user.username);

    if (user.hasOwnProperty('location')) {
      await models.user.updateLocation(user.username, user.location);
    }
  }

  for(const tag of processed.tags) {
    const tagData = _.pick(tag, ['tagname']);
    tagData.creator = processed.users[tag.creator].username;
    await models.tag.create(tagData);
  }

  for(const userTag of processed.userTag) {
    const username = userTag.user.username;
    const tagname = userTag.tag.tagname;
    const story = userTag.story || '';
    const relevance = userTag.relevance || 3;
    await models.userTag.create({ username, tagname, story, relevance });
  }

  for(const message of processed.messages) {
    const from = message.from.username;
    const to = message.to.username;
    const body = message.body;
    const created = message.created;
    const outMessage = await models.message.create({ from, to, body, created });
    if (!outMessage) {
      const e = new Error('message could not be saved');
      e.data = message;
      throw e;
    }
    message.id = outMessage.id;
  }

  for(const contact of processed.contacts) {
    const { from: { username: from }, to: { username: to }, message, reference01, reference10, trust01, trust10, notified, isConfirmed } = contact;
    await models.contact.create({ from, to, message, reference: reference01, notified, trust: trust01 });
    if (isConfirmed === true) {
      await models.contact.confirm(to, from, { trust: trust10, reference: reference10 });

    }
  }

  for(const idea of processed.ideas) {
    const creator = idea.creator.username;
    const title = idea.title;
    const detail = idea.detail;
    const created = idea.created;
    const outIdea = await models.idea.create({ title, detail, created, creator });
    if (!outIdea) {
      const e = new Error('idea could not be saved');
      e.data = idea;
      throw e;
    }
    idea.id = outIdea.id;
  }

  for(const ideaTag of processed.ideaTags) {
    const creator = ideaTag.creator.username;
    const ideaId = ideaTag.idea.id;
    const tagname = ideaTag.tag.tagname;

    await models.ideaTag.create(ideaId, tagname, { }, creator);
  }

  for(const ideaComment of processed.ideaComments) {
    const creator = ideaComment.creator.username;
    const ideaId = ideaComment.idea.id;
    const { content, created } = ideaComment;
    const primary = { type: 'ideas', id: ideaId };

    const newComment = await models.comment.create({ primary, creator, content, created });

    // save the comment's id
    ideaComment.id = newComment.id;
  }

  for(const reaction of processed.reactions) {
    const creator = reaction.creator.username;
    const commentId = reaction.comment.id;
    const { content, created } = reaction;
    const primary = { type: 'comments', id: commentId };

    const newReaction = await models.comment.create({ primary, creator, content, created });

    // save the reaction's id
    reaction.id = newReaction.id;
  }

  for (const vote of processed.votes) {
    const from = vote.from.username;
    const to = { type: vote._to.type, id: vote.to.id };
    const value = vote.value;

    const newVote = await models.vote.create({ from, to, value });

    // save the vote's id
    vote.id = newVote.id;
  }

  for (const care of processed.cares) {
    const from = care.from.username;
    const to = { type: care._to.type, id: care.to.id };

    const newCare = await models.care.create({ from, to });

    // save the care's id
    care.id = newCare.id;
  }

  return processed;
};

exports.clear = function () {
  return models.db.truncate();
};

/*
 * Prepare data for saving to database
 *
 *
 */
function processData(data) {
  const output = {};

  output.users = _.map(_.range(data.users), function (n) {
    const resp = {
      username: `user${n}`,
      password: 'a*.0-1fiuyt',
      email: `user${n}@example.com`,
      tags: [],
      _messages: [],
      _contacts: [],
      _ideas: [],
      get messages() {
        return _.map(this._messages, message => output.messages[message]);
      },
      verified: false
    };
    if (data.verifiedUsers.indexOf(n) > -1) resp.verified = true;

    if (data.userLocations.hasOwnProperty(n)) {
      resp.location = data.userLocations[n];
    }

    return resp;
  });

  // create factory tags
  const autoTags = _.map(_.range(data.tags), function (n) {
    const pickedUser = n % data.users;
    const resp = {
      tagname: `tag${n}`,
      creator: pickedUser
    };
    return resp;
  });

  // create named tags
  const namedTags = _.map(_.range(data.namedTags.length), function (n) {
    const pickedUser = n % data.users;
    const resp = {
      tagname: data.namedTags[n],
      creator: pickedUser
    };
    return resp;
  });

  // put default and named tags together
  output.tags = autoTags.concat(namedTags);

  output.userTag = _.map(data.userTag, function ([userno, tagno, story, relevance]) {
    const resp = {
      userno,
      tagno,
      get tag() {
        return output.tags[tagno];
      },
      get user() {
        return output.users[userno];
      },
      story: story || '',
      relevance: relevance || 3
    };

    output.users[userno].tags.push(tagno);
    return resp;
  });

  // create messages
  output.messages = _.map(data.messages, function ([_from, _to, body, created], i) {
    const resp = {
      _from,
      _to,
      get from() {
        return output.users[_from];
      },
      get to() {
        return output.users[_to];
      },
      body: body || 'default message',
      created: created || Date.now() + 1000 * i
    };

    resp.from._messages.push(i);
    resp.to._messages.push(i);

    return resp;
  });

  // create contacts
  output.contacts = _.map(data.contacts, function ([_from, _to, attrs], i) {
    const { trust01, trust10, reference01, reference10, message, confirmed, isConfirmed, notified, created } = attrs || {};
    const resp = {
      _from,
      _to,
      get from() {
        return output.users[_from];
      },
      get to() {
        return output.users[_to];
      },
      trust01: trust01 || 2 ** (i % 4), // 1, 2, 4, 8
      reference01: reference01 || 'default reference 01',
      trust10: trust10 || 2 ** (3 - (i % 4)), // 1, 2, 4, 8
      reference10: reference10 || 'default reference 10',
      message: message || 'default message',
      isConfirmed: (typeof(isConfirmed) === 'boolean') ? isConfirmed : true,
      confirmed: confirmed || Date.now() + 2000 * i,
      notified: (typeof(notified) === 'boolean') ? notified : true,
      created: created || Date.now() + 1000 * i
    };

    resp.from._contacts.push(i);
    resp.to._contacts.push(i);

    return resp;
  });

  output.ideas = data.ideas.map(function ([attrs = { }, _creator = 0], i) {
    const { title = `idea title ${i}`, detail = `idea detail ${i}`, created = Date.now() + 1000 * i } = attrs;
    const resp = {
      _creator,
      get creator() {
        return output.users[_creator];
      },
      title,
      detail,
      created
    };

    resp.creator._ideas.push(i);

    return resp;
  });

  output.ideaTags = data.ideaTags.map(function ([_idea, _tag]) {
    const resp = {
      _idea,
      _tag,
      get idea() { return output.ideas[this._idea]; },
      get tag() { return output.tags[this._tag]; },
      get creator() { return this.idea.creator; }
    };

    return resp;
  });

  output.ideaComments = data.ideaComments.map(([_idea, _creator, attrs = { }], i) => {
    const { content = `idea comment ${i}`, created = Date.now() + 1000 * i } = attrs;
    const resp = {
      _creator,
      _idea,
      get creator() { return output.users[this._creator]; },
      get idea() { return output.ideas[this._idea]; },
      content,
      created
    };

    return resp;
  });

  // put comments together
  Object.defineProperty(output, 'comments', { get: function () { return this.ideaComments; } });

  output.reactions = data.reactions.map(([_comment, _creator, attrs = { }], i) => {
    const { content = `reaction content ${i}`, created = Date.now() + 1000 * i } = attrs;
    const resp = {
      _creator,
      _comment,
      get creator() { return output.users[this._creator]; },
      get comment() { return output.comments[this._comment]; },
      content,
      created
    };

    return resp;
  });

  output.votes = data.votes.map(([from, to, value]) => {
    const [type, id] = to;
    return {
      _from: from,
      _to: { type, id },
      get from() { return output.users[this._from]; },
      get to() { return output[this._to.type][this._to.id]; },
      value
    };
  });

  output.cares = data.cares.map(([from, to]) => {
    const [type, id] = to;
    return {
      _from: from,
      _to: { type, id },
      get from() { return output.users[this._from]; },
      get to() { return output[this._to.type][this._to.id]; }
    };
  });

  return output;
}
