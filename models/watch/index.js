'use strict';

const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Watch extends Model {

  /**
   * Create a watch.
   * @param {string} from - username of the watch giver
   * @param {object} to - receiver object of the watch
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @returns Promise - the saved watch
   */
  static async create({ from: username, to: { type, id } }) {
    // generate the watch
    const watch = schema({ });

    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          LET watch = MERGE(@watch, { _from: u._id, _to: i._id })
          INSERT watch INTO watches

          LET from = MERGE(KEEP(u, 'username'), u.profile)
          LET to = MERGE(KEEP(i, 'title', 'detail', 'created'), { id: i._key })
          LET savedWatch = MERGE(KEEP(NEW, 'created'), { id: NEW._key }, { from }, { to })
          RETURN savedWatch`;
    const params = { username, '@type': type, id, watch };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    // when nothing was created, throw error
    if (out.length === 0) {
      const e = new Error('not found');
      e.code = 404;
      throw e;
    }

    // what is the type of the object the watch was given to (important for serialization)
    out[0].to.type = type;

    return out[0];
  }

  /**
   * Read a watch from user to idea or something.
   * @param {string} from - username of the watch giver
   * @param {object} to - receiver object of the watch
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @returns Promise - the found watch or undefined
   */
  static async read({ from: username, to: { type, id } }) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          FOR w IN watches FILTER w._from == u._id && w._to == i._id
            RETURN w`;
    const params = { username, '@type': type, id };
    const cursor = await this.db.query(query, params);

    return (await cursor.all())[0];
  }
}

module.exports = Watch;
