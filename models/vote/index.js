'use strict';

const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Vote extends Model {

  /**
   * Create a vote.
   * @param {string} from - username of the vote giver
   * @param {object} to - receiver object of the vote
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @param {number} value - 1 or -1 - value of the vote
   * @returns Promise - the saved vote
   */
  static async create({ from: username, to: { type, id }, value }) {
    // generate the vote
    const vote = schema({ value });

    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          LET vote = MERGE(@vote, { _from: u._id, _to: i._id })
          INSERT vote INTO votes

          LET from = MERGE(KEEP(u, 'username'), u.profile)
          LET to = MERGE(KEEP(i, 'title', 'detail', 'created'), { id: i._key })
          LET savedVote = MERGE(KEEP(NEW, 'created', 'value'), { id: NEW._key }, { from }, { to })
          RETURN savedVote`;
    const params = { username, '@type': type, id, vote };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    // when nothing was created, throw error
    if (out.length === 0) {
      const e = new Error('not found');
      e.code = 404;
      throw e;
    }

    // what is the type of the object the vote was given to (important for serialization)
    out[0].to.type = type;

    return out[0];
  }

  /**
   * Read a vote from user to idea or something.
   * @param {string} from - username of the vote giver
   * @param {object} to - receiver object of the vote
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @returns Promise - the found vote or undefined
   */
  static async read({ from: username, to: { type, id } }) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          FOR v IN votes FILTER v._from == u._id && v._to == i._id
            RETURN v`;
    const params = { username, '@type': type, id };
    const cursor = await this.db.query(query, params);

    return (await cursor.all())[0];
  }

  /**
   * Read a vote from user to multiple ideas or comments or something
   * @param {string} from - username of the vote giver
   * @param {object} to - receiver object of the vote
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string[]} to.ids - array of ids of the receivers
   * @returns Promise - the array of found votes or nulls
   */
  static async readMany({ from: username, to: { type, ids } }) {
    const query = `
      FOR id IN @ids
        LET vote = (FOR u IN users FILTER u.username == @username
          FOR i IN @@type FILTER i._key == id
            FOR v IN votes FILTER v._from == u._id && v._to == i._id
              RETURN v)
        RETURN vote[0]`;
    const params = { username, '@type': type, ids };
    const cursor = await this.db.query(query, params);

    return await cursor.all();
  }

  /**
   * Remove a vote.
   * @param {string} from - username of the vote giver
   * @param {object} to - receiver object of the vote
   * @param {string} to.type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} to.id - id of the receiver
   * @returns Promise
   */
  static async remove({ from: username, to: { type, id } }) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR i IN @@type FILTER i._key == @id
          FOR v IN votes FILTER v._from == u._id AND v._to == i._id
          REMOVE v IN votes`;
    const params = { username, '@type': type, id };
    const cursor = await this.db.query(query, params);

    if (cursor.extra.stats.writesExecuted === 0) {
      const e = new Error('primary or vote not found');
      e.code = 404;
      throw e;
    }
  }

  /**
   * Read votes of a primary object.
   * @param {string} type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string} id - id of the receiver
   * @returns Promise - array of votes
   */
  static async readVotesTo({ type, id }) {
    const query = `
      FOR i IN @@type FILTER i._key == @id
        FOR v, e IN 1..1 INBOUND i INBOUND votes
          RETURN e`;
    const params = { '@type': type, id };
    const cursor = await this.db.query(query, params);

    return await cursor.all();
  }

  /**
   * Read votes of array of primary objects.
   * @param {string} type - type of the receiver (collection name, i.e. 'ideas')
   * @param {string[]} ids - array of ids of the receivers
   * @returns Promise - array of arrays of votes
   */
  static async readVotesToMany({ type, ids }) {
    const query = `
      FOR id IN @ids
        LET votes = (FOR i IN @@type FILTER i._key == id
          FOR v, e IN 1..1 INBOUND i INBOUND votes
            RETURN e)
        RETURN votes`;
    const params = { '@type': type, ids };
    const cursor = await this.db.query(query, params);

    return await cursor.all();
  }
}

module.exports = Vote;
