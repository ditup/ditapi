'use strict';

const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Comment extends Model {

  /**
   * Create a comment
   * @param {string} content - text of the comment
   * @param {object} primary - idea or other object which the comment belongs to
   * @param {string} primary.type - type of the primary object (i.e. ideas)
   * @param {string} primary.id - id of the primary object
   * @param {string} creator - username of the comment author
   * @returns Promise<Comment>
   */
  static async create({ content, primary: { type, id },  creator, created }) {
    // create the comment
    const comment = schema({ content, created });

    const query = `
      FOR u IN users FILTER u.username == @creator
        FOR t IN @@type FILTER t._key == @id
        INSERT MERGE(@comment, { creator: u._id, primary: t._id }) IN comments
        LET creator = MERGE(KEEP(u, 'username'), u.profile)
        LET primary = MERGE(t, { id: t._key })
        LET savedComment = MERGE(KEEP(NEW, 'content', 'created'), { id: NEW._key }, { creator, primary })
        RETURN savedComment`;
    const params = { comment, creator, '@type': type, id };

    const cursor = await this.db.query(query, params);

    const out = await cursor.all();

    if (out.length !== 1) return null;

    return out[0];
  }

  /**
   * Read a comment by id
   * @param {string} id - id of the comment
   * @returns Promise<Comment>
   */
  static async read(id) {
    const query = `
      FOR c IN comments FILTER c._key == @id
        LET p = DOCUMENT(c.primary)
        LET u = DOCUMENT(c.creator)
        LET creator = MERGE(KEEP(u, 'username'), u.profile)
        LET primary = MERGE(p, { id: p._key, type: PARSE_IDENTIFIER(p).collection })
        LET formattedComment = MERGE(KEEP(c, 'content', 'created'), { id: c._key }, { creator, primary })
        RETURN formattedComment`;
    const params = { id };
    const cursor = await this.db.query(query, params);

    const out = await cursor.all();

    if (out.length !== 1) return null;

    return out[0];
  }

  /**
   * Read comments of a primary object (i.e. idea)
   * @param {string} type - type of primary object, i.e. ideas
   * @param {string} id - id of the primary object
   * @param {number} offset - output pagination offset
   * @param {number} limit - output pagination limit
   * @param {string} [sort=created] - how to sort output
   */
  static async readCommentsOf({ type, id }, { sort = 'created', offset, limit } = { }) {

    // find out by what to sort the comments
    // @TODO by votes
    const formattedSort = (sort === '-created')
      ? 'c.created DESC'
      : 'c.created ASC';

    const query = `
      // find the primary object
      LET primaryRaw = (FOR p IN @@type FILTER p._key == @id RETURN p)
      // find the comments
      LET outputComments = (FOR p IN primaryRaw
        LET primary = MERGE(p, { id: p._key, type: PARSE_IDENTIFIER(p).collection })
        // find the comments of the primary object
        FOR c IN comments FILTER c.primary == p._id
          LET u = DOCUMENT(c.creator)
          LET creator = MERGE(KEEP(u, 'username'), u.profile)
          LET formattedComment = MERGE(KEEP(c, 'content', 'created'), { id: c._key }, { creator, primary })
          SORT ${formattedSort}
          LIMIT @offset, @limit
          RETURN formattedComment)
      RETURN [primaryRaw, outputComments]`;
    const params = { '@type': type, id, offset, limit };
    const cursor = await this.db.query(query, params);

    const [[primary, comments]] = await cursor.all();

    // when primary object doesn't exist error
    if (primary.length === 0) {
      const e = new Error('primary not found');
      e.code = 404;
      throw e;
    }

    return comments;
  }
}

module.exports = Comment;
