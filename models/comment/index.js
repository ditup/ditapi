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
  static async create({ content, primary: { type, id },  creator }) {
    // create the comment
    const comment = schema({ content });

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
}

module.exports = Comment;
