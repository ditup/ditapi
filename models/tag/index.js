let path = require('path'),
    _ = require('lodash'),
    co = require('co');

let Model = require(path.resolve('./models/model')),
    schema = require('./schema');

class Tag extends Model {
  static create({ tagname: tagname, description: description, creator: creator }) {
    let tag = schema({ tagname, description });
    return co.call(this, function* () {
      let query = `INSERT @tag IN tags`;
      let params = { tag: tag };

      yield this.db.query(query, params);

      let queryCreator = `
        FOR u IN users FILTER u.username == @creator
          FOR t IN tags FILTER t.tagname == @tagname
            INSERT {
              _from: t._id,
              _to: u._id,
              created: @created
            } IN tagCreator
            RETURN NEW`;
      let paramsCreator = {
        creator,
        tagname,
        created: Date.now()
      };

      yield this.db.query(queryCreator, paramsCreator);
    });
  }

  static read(tagname) {
    return co.call(this, function* () {
      let query = `
        FOR t IN tags FILTER t.tagname == @tagname
          FOR v, e, p
            IN 0..1
            OUTBOUND t
            OUTBOUND tagCreator
            RETURN KEEP(v, 'username', 'tagname', 'description', 'created')`;
      let params = { tagname: tagname };
      let out = yield (yield this.db.query(query, params)).all();

      let tag = _.pick(out[0], 'tagname', 'description', 'created');
      let creator = _.pick(out[1], 'username');
      _.assign(tag, { creator });

      return (out[0]) ? tag : null;
    });
  }

  static exists(tagname) {
    return co.call(this, function * () {
      let query = `
        FOR t IN tags FILTER t.tagname == @tagname
          COLLECT WITH COUNT INTO length
          RETURN length`;
      let params = { tagname: tagname };
      let count = yield (yield this.db.query(query, params)).next();

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


module.exports = Tag;
