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

    // Are we creating comment or reaction?
    // If primary is comment, we create reaction; otherwise we create comment.
    const comments = (type === 'comments') ? 'reactions' : 'comments';

    // create the comment
    const comment = schema({ content, created });

    const query = `
      FOR u IN users FILTER u.username == @creator
        FOR t IN @@type FILTER t._key == @id
        INSERT MERGE(@comment, { creator: u._id, primary: t._id }) IN ${comments}
        LET creator = MERGE(KEEP(u, 'username'), u.profile)
        LET primary = MERGE(t, { id: t._key, type: PARSE_IDENTIFIER(t).collection })
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
   * @param {string} [comments=comments] - treat comments as reactions when 'reactions'
   * @returns Promise<Comment>
   */
  static async read(id, comments='comments') {
    const query = `
      FOR c IN ${comments} FILTER c._key == @id
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

    const isPagination = typeof offset === 'number' && typeof limit === 'number';

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

          // find reactions of each comment
          LET commentReactions = (
            FOR r IN reactions FILTER r.primary == c._id
              LET ru = DOCUMENT(r.creator)
              LET rCreator = MERGE(KEEP(ru, 'username'), ru.profile)
              LET formatted = MERGE(KEEP(r, 'content', 'created'), { id: r._key }, { creator: rCreator, primary: MERGE(KEEP(formattedComment, 'id'), { type: 'comments' }) })
              SORT formatted.created ASC
              RETURN formatted
          )

          SORT ${formattedSort}
          ${(isPagination) ? 'LIMIT @offset, @limit' : ''}
          RETURN MERGE(formattedComment, { reactions: commentReactions }))
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

  /**
   * Update a comment.
   * @param {string} id - id of the comment to update
   * @param {string} content - content of the commment to update
   * @param {username} string - username of the user who is making the update
   * @param {string} [comments=comments] - treat comments as reactions when 'reactions'
   * @returns Promise<Comment> - updated comment
   */
  static async update(id, { content }, username, comments='comments') {
    const query = `
      // find the [comment]
      LET cs = (FOR c IN ${comments} FILTER c._key == @id RETURN c)
      // update comment and return the updated comment
      LET out = (
        FOR comment IN cs
          // continue only if user is the creator
          LET u = DOCUMENT(comment.creator)
          FILTER u.username == @username
          // read and format primary object and creator
          LET p = DOCUMENT(comment.primary)
          LET primary = MERGE(p, { id: p._key, type: PARSE_IDENTIFIER(p).collection })
          LET creator = MERGE(KEEP(u, 'username'), u.profile)
          // update
          UPDATE comment WITH { content: @content } IN ${comments}
          // return the updated comment
          LET formattedComment = MERGE(KEEP(NEW, 'content', 'created'), { id: NEW._key }, { creator, primary })
          RETURN formattedComment
      )
      // return comment and formatted comment
      // if comment is there, but formatted comment not, user is not the creator
      // and comment was not updated
      RETURN [cs[0], out[0]]`;

    const params = { id, content, username };
    const cursor = await this.db.query(query, params);

    const [[comment, updated]] = await cursor.all();

    // comment was not found
    if (!comment) {
      const e = new Error(`${comments.slice(0, -1)} not found`);
      e.code = 404;
      throw e;
    }

    // user and comment was found, but user & comment.creator don't match
    // comment not updated
    if (!updated) {
      const e = new Error('not a creator');
      e.code = 403;
      throw e;
    }

    return updated;
  }

  /**
   * Delete a comment.
   * @param {string} id - id of the comment to remove
   * @param {string} username - username of the user who is removing
   * @param {string} [comments=comments] - treat comments as reactions when 'reactions'
   * @returns Promise<void>
   */
  static async remove(id, username, comments='comments') {
    const query = `
      // find the [comment]
      LET cs = (FOR c IN ${comments} FILTER c._key == @id RETURN c)
      // remove the comment
      LET out = (FOR c IN cs
        // remove comment only if requesting user is creator
        FILTER DOCUMENT(c.creator).username == @username
        REMOVE c IN ${comments} RETURN 0)
      // return the comment to see if the comment was found
      RETURN cs
    `;
    const params = { id, username };
    const cursor = await this.db.query(query, params);

    // if the comment was not removed, throw an appropriate error
    if (cursor.extra.stats.writesExecuted === 0) {

      const [foundComments] = await cursor.all();
      // either not authorized (comment found but not removed)
      if (foundComments.length === 1) {
        const e = new Error('not a creator');
        e.code = 403;
        throw e;
      } else {
        // or comment was not found
        const e = new Error(`${comments.slice(0, -1)} not found`);
        e.code = 404;
        throw e;
      }
    }

    // remove also orphaned reactions
    if (comments === 'comments') {
      const queryReactions = `
        FOR r IN reactions FILTER r.primary == CONCAT('comments/', @id)
          REMOVE r IN reactions`;
      const paramsReactions = { id };
      await this.db.query(queryReactions, paramsReactions);
    }
  }
}

module.exports = Comment;
