let path = require('path'),
    _ = require('lodash'),
    co = require('co');

let Model = require(path.resolve('./models/model')),
    schema = require('./schema');

class Tag extends Model {
  static async create({ tagname, description, creator }) {
    let tag = schema({ tagname, description });
    let query = 'INSERT @tag IN tags';
    let params = { tag };

    await this.db.query(query, params);

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

    await this.db.query(queryCreator, paramsCreator);
  }

  static async read(tagname) {
    let query = `
      FOR t IN tags FILTER t.tagname == @tagname
        FOR v, e, p
          IN 0..1
          OUTBOUND t
          OUTBOUND tagCreator
          RETURN KEEP(v, 'username', 'tagname', 'description', 'created')`;
    let params = { tagname: tagname };
    let out = await (await this.db.query(query, params)).all();

    let tag = _.pick(out[0], 'tagname', 'description', 'created');
    let creator = _.pick(out[1], 'username');
    _.assign(tag, { creator });

    return (out[0]) ? tag : null;
  }

  static async update(tagname, { description, editor, time }) {
    let query = `FOR t IN tags FILTER t.tagname == @tagname
      UPDATE t WITH {
        description: @description,
        history: PUSH(t.history, {
          description: @description,
          editor: @editor,
          time: @time
        })
      }
      IN tags
      RETURN NEW`;
    let params = { tagname, description, editor, time };
    let cursor = await this.db.query(query, params);
    let output = await cursor.all();
    return output[0];
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
        case 1:
          return true;
        default:
          throw new Error('bad output');
      }
    });
  }

  // get tags which start with likeTagname string
  static async filter(likeTagname) {
    let query = `
      FOR t IN tags FILTER t.tagname LIKE @likeTagname
        RETURN KEEP(t, 'username', 'tagname', 'description', 'created')`;
    // % serves as a placeholder for multiple characters in arangodb LIKE
    // _ serves as a placeholder for a single character
    let params = { likeTagname: `%${likeTagname}%` };
    let out = await (await this.db.query(query, params)).all();

    let formatted = [];

    for(let tag of out) {
      formatted.push(_.pick(tag, ['tagname', 'description']));
    }

    return formatted;
  }
}


module.exports = Tag;
