'use strict';

const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class IdeaTag extends Model {

  /**
   * create ideaTag in database
   */
  static async create(ideaId, tagname, ideaTagInput, creator) {
    // generate standard ideaTag
    const ideaTag = await schema(ideaTagInput);

    const query = `
      FOR i IN ideas FILTER i._key == @ideaId
        FOR t IN tags FILTER t.tagname == @tagname
          FOR u IN users FILTER u.username == @creator
            INSERT MERGE({ _from: i._id, _to: t._id, creator: u._id }, @ideaTag) IN ideaTags
            LET creator = MERGE(KEEP(u, 'username'), u.profile)
            LET ideaTag = KEEP(NEW, 'created')
            LET tag = KEEP(t, 'tagname')
            LET idea = MERGE(KEEP(i, 'title', 'detail'), { id: i._key })
            RETURN MERGE(ideaTag, { creator, tag, idea })`;

    const params = { ideaId, tagname, ideaTag, creator };

    const cursor = await this.db.query(query, params);

    return (await cursor.all())[0];
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
}

module.exports = IdeaTag;
