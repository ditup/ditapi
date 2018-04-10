'use strict';

const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Watch extends Model {

  /**
   * Create a care.
   * @param {string} from - username of the care giver
   * @param {object} to - receiver object of the care
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @returns Promise - the saved care
   */
  static async create({ from: username, to: { type, id } }) {
    // generate the care
    const care = schema({ });

    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          LET care = MERGE(@care, { _from: u._id, _to: i._id })
          INSERT care INTO cares

          LET from = MERGE(KEEP(u, 'username'), u.profile)
          LET to = MERGE(KEEP(i, 'title', 'detail', 'created'), { id: i._key })
          LET savedWatch = MERGE(KEEP(NEW, 'created'), { id: NEW._key }, { from }, { to })
          RETURN savedWatch`;
    const params = { username, '@type': type, id, care };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    // when nothing was created, throw error
    if (out.length === 0) {
      const e = new Error('not found');
      e.code = 404;
      throw e;
    }

    // what is the type of the object the care was given to (important for serialization)
    out[0].to.type = type;

    return out[0];
  }

  /**
   * Read a care from user to idea or something.
   * @param {string} from - username of the care giver
   * @param {object} to - receiver object of the care
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @returns Promise - the found care or undefined
   */
  static async read({ from: username, to: { type, id } }) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          FOR w IN cares FILTER w._from == u._id && w._to == i._id
            RETURN w`;
    const params = { username, '@type': type, id };
    const cursor = await this.db.query(query, params);

    return (await cursor.all())[0];
  }

  /**
   * Remove a care.
   * @param {string} from - username of the care giver
   * @param {object} to - receiver object of the care
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @returns Promise
   */
  static async remove({ from: username, to: { type, id } }) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          FOR v IN cares FILTER v._from == u._id AND v._to == i._id
          REMOVE v IN cares`;
    const params = { username, '@type': type, id };
    const cursor = await this.db.query(query, params);

    if (cursor.extra.stats.writesExecuted === 0) {
      const e = new Error('primary or care not found');
      e.code = 404;
      throw e;
    }
  }
}

module.exports = Watch;
