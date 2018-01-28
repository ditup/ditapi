'use strict';

const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class IdeaTag extends Model {

  /**
   * Create ideaTag in database
   */
  static async create(ideaId, tagname, ideaTagInput, creatorUsername) {
    // generate standard ideaTag
    const ideaTag = await schema(ideaTagInput);

    const query = `
      // array of ideas (1 or 0)
      LET is = (FOR i IN ideas FILTER i._key == @ideaId RETURN i)
      // array of tags (1 or 0)
      LET ts = (FOR t IN tags FILTER t.tagname == @tagname RETURN t)
      // array of users (1 or 0)
      LET us = (FOR u IN users FILTER u.username == @creatorUsername RETURN u)
      // create the ideaTag (if idea, tag and creator exist)
      LET ideaTag = (FOR i IN is FOR t IN ts FOR u IN us FILTER u._id == i.creator
        INSERT MERGE({ _from: i._id, _to: t._id, creator: u._id }, @ideaTag) IN ideaTags RETURN KEEP(NEW, 'created'))[0] || { }
      // if ideaTag was not created, default to empty object (to be able to merge later)
      // gather needed data
      LET creator = MERGE(KEEP(us[0], 'username'), us[0].profile)
      LET tag = KEEP(ts[0], 'tagname')
      LET idea = MERGE(KEEP(is[0], 'title', 'detail'), { id: is[0]._key })
      // return data
      RETURN MERGE(ideaTag, { creator, tag, idea })`;

    const params = { ideaId, tagname, ideaTag, creatorUsername };

    const cursor = await this.db.query(query, params);

    const response = (await cursor.all())[0];

    switch (cursor.extra.stats.writesExecuted) {
      // ideaTag was created
      case 1: {
        return response;
      }
      // ideaTag was not created
      case 0: {
        throw generateError(response);
      }
    }

    function generateError(response) {
      let e;
      // check that idea, tag and creator exist
      const { idea, tag, creator } = response;

      // some of them don't exist, then ideaTag was not created
      if (!(idea && tag && creator)) {
        e = new Error('Not Found');
        e.code = 404;
        e.missing = [];

        ['idea', 'tag', 'creator'].forEach((potentialMissing) => {
          if (!response[potentialMissing]) e.missing.push(potentialMissing);
        });
      } else {
        // if all exist, then idea creator !== ideaTag creator, not authorized
        e = new Error('Not Authorized');
        e.code = 403;
      }

      return e;
    }

  }

  /**
   * Read ideaTag from database
   */
  static async read(ideaId, tagname) {

    const query = `
      FOR t IN tags FILTER t.tagname == @tagname
        FOR i IN ideas FILTER i._key == @ideaId
          FOR it IN ideaTags FILTER it._from == i._id AND it._to == t._id
            LET creator = (FOR u IN users FILTER u._id == it.creator
              RETURN MERGE(KEEP(u, 'username'), u.profile))[0]
            LET ideaTag = KEEP(it, 'created')
            LET tag = KEEP(t, 'tagname')
            LET idea = MERGE(KEEP(i, 'title', 'detail'), { id: i._key })
            RETURN MERGE(ideaTag, { creator, tag, idea })`;
    const params = { ideaId, tagname };

    const cursor = await this.db.query(query, params);

    return (await cursor.all())[0];
  }

  /**
   * Read tags of idea
   */
  static async readTagsOfIdea(ideaId) {

    const query = `
      // read idea into array (length 1 or 0)
      LET is = (FOR i IN ideas FILTER i._key == @ideaId RETURN i)
      // read ideaTags
      LET its = (FOR i IN is
        FOR it IN ideaTags FILTER it._from == i._id
          FOR t IN tags FILTER it._to == t._id
            SORT t.tagname
            LET ideaTag = KEEP(it, 'created')
            LET tag = KEEP(t, 'tagname')
            LET idea = MERGE(KEEP(i, 'title', 'detail'), { id: i._key })
            RETURN MERGE(ideaTag, { tag, idea })
      )
      RETURN { ideaTags: its, idea: is[0] }`;
    const params = { ideaId };

    const cursor = await this.db.query(query, params);

    const [{ idea, ideaTags }] = await cursor.all();

    // when idea not found, error
    if (!idea) {
      const e = new Error('idea not found');
      e.code = 404;
      throw e;
    }

    return ideaTags;
  }
}

module.exports = IdeaTag;
