'use strict'

let co = require('co'),
    _ = require('lodash'),
    path = require('path');

let Model = require(path.resolve('./models/model')),
    schema = require('./schema');

class UserTag extends Model {
  static read(username, tagname) {
    return co.call(this, function* () {
      let query = `
        FOR u IN users FILTER u.username == @username
          FOR v, e IN 1
            OUTBOUND u
            userTag
            FILTER v.tagname == @tagname
            LET ut = KEEP(e, 'story', 'created')
            LET us = MERGE(KEEP(u, 'username'), u.profile)
            LET tg = KEEP(v, 'tagname', 'description', 'created')
            RETURN MERGE(ut, { user: us }, { tag: tg })`;
      let params = { username, tagname };
      let cursor = yield this.db.query(query, params);
      let out = yield cursor.all();
      return out[0];
    });
  }

  static create({ username, tagname, story }) {
    return co.call(this, function* () {
      let userTag = schema({ story });
      let query = `
        FOR u IN users FILTER u.username == @username
          FOR t IN tags FILTER t.tagname == @tagname
            INSERT MERGE({ _from: u._id, _to: t._id }, @userTag) IN userTag
            LET ut = KEEP(NEW, 'story', 'created')
            LET us = MERGE(KEEP(u, 'username'), u.profile)
            LET tg = KEEP(t, 'tagname', 'description', 'created')
            RETURN MERGE(ut, { user: us }, { tag: tg })`;
      let params = { username, tagname, userTag };
      let cursor = yield this.db.query(query, params);
      let out = yield cursor.all();
      
      if (out.length !== 1) return null;
      return out[0];
    });
  }

  static exists(username, tagname) {
    return co.call(this, function * () {
      let query = `
        FOR u IN users FILTER u.username == @username
          FOR v IN 1
            OUTBOUND u
            userTag
            FILTER v.tagname == @tagname
            COLLECT WITH COUNT INTO length
            RETURN length`;
      let params = { username, tagname };
      let cursor = yield this.db.query(query, params);
      let count = yield cursor.next();

      switch (count) {
        case 0:
          return false;
          break;
        case 1:
          return true;
          break;
        default:
          throw new Error('bad output');
      }
    });
  }
}

module.exports = UserTag;
