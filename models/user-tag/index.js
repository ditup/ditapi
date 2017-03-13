'use strict';

const path = require('path'),
      _ = require('lodash');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class UserTag extends Model {
  static async read(username, tagname) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR v, e IN 1
          OUTBOUND u
          userTag
          FILTER v.tagname == @tagname
          LET ut = KEEP(e, 'story', 'created', 'relevance')
          LET us = MERGE(KEEP(u, 'username'), u.profile)
          LET tg = KEEP(v, 'tagname', 'description', 'created')
          RETURN MERGE(ut, { user: us }, { tag: tg })`;
    const params = { username, tagname };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();
    return out[0];
  }

  static async create({ username, tagname, story, relevance }) {
    const userTag = schema({ story, relevance });
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR t IN tags FILTER t.tagname == @tagname
          INSERT MERGE({ _from: u._id, _to: t._id }, @userTag) IN userTag
          LET ut = KEEP(NEW, 'story', 'relevance', 'created')
          LET us = MERGE(KEEP(u, 'username'), u.profile)
          LET tg = KEEP(t, 'tagname', 'description', 'created')
          RETURN MERGE(ut, { user: us }, { tag: tg })`;
    const params = { username, tagname, userTag };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    if (out.length !== 1) return null;
    return out[0];
  }

  static async update(username, tagname, newData) {
    const newUserTagData = _.pick(newData, ['relevance', 'story']);
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR v, e IN 1
          OUTBOUND u
          userTag
          FILTER v.tagname == @tagname
          UPDATE e WITH @newUserTagData IN userTag
          RETURN NEW`;
    const params = { username, tagname, newUserTagData };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output[0];
  }

  static async exists(username, tagname) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR v IN 1
          OUTBOUND u
          userTag
          FILTER v.tagname == @tagname
          COLLECT WITH COUNT INTO length
          RETURN length`;
    const params = { username, tagname };
    const cursor = await this.db.query(query, params);
    const count = await cursor.next();

    switch (count) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('bad output');
    }
  }

  static async delete(username, tagname) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR v, e IN 1
          OUTBOUND u
          userTag
          FILTER v.tagname == @tagname
          REMOVE e IN userTag
          RETURN OLD`;
    const params = { username, tagname };
    const cursor = await this.db.query(query, params);
    const writes = cursor.extra.stats.writesExecuted;

    switch (writes) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('database corruption');
    }
  }
}

module.exports = UserTag;
