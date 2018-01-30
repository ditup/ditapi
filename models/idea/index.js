const _ = require('lodash'),
      path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Idea extends Model {

  /**
   * Create an idea
   */
  static async create({ title, detail, creator }) {
    // create the idea
    const idea = schema({ title, detail });

    const query = `
      FOR u IN users FILTER u.username == @creator
        INSERT MERGE(@idea, { creator: u._id }) IN ideas
        LET creator = MERGE(KEEP(u, 'username'), u.profile)
        LET savedIdea = MERGE(KEEP(NEW, 'title', 'detail', 'created'), { id: NEW._key }, { creator })
        RETURN savedIdea`;
    const params = { idea, creator };

    const cursor = await this.db.query(query, params);

    const out = await cursor.all();

    if (out.length !== 1) return null;

    return out[0];
  }

  /**
   * Read the idea by id (_key in db).
   */
  static async read(id) {

    const query = `
      FOR i IN ideas FILTER i._key == @id
        LET creator = (FOR u IN users FILTER u._id == i.creator
          RETURN MERGE(KEEP(u, 'username'), u.profile))[0]
        RETURN MERGE(KEEP(i, 'title', 'detail', 'created'), { id: i._key}, { creator })`;
    const params = { id };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();
    return out[0];

  }

  /**
   * Update an idea
   */
  static async update(id, newData, username) {
    const idea = _.pick(newData, ['title', 'detail']);
    const query = `
      // read [user]
      LET us = (FOR u IN users FILTER u.username == @username RETURN u)
      // read [idea]
      LET is = (FOR i IN ideas FILTER i._key == @id RETURN i)
      // update idea if and only if user matches idea creator
      LET newis = (
        FOR i IN is FOR u IN us FILTER u._id == i.creator
          UPDATE i WITH @idea IN ideas
          LET creator = MERGE(KEEP(u, 'username'), u.profile)
          RETURN MERGE(KEEP(NEW, 'title', 'detail', 'created'), { id: NEW._key }, { creator })
      )
      // return old and new idea (to decide what is the error)
      RETURN [is[0], newis[0]]`;
    const params = { id, idea, username };
    const cursor = await this.db.query(query, params);
    const [[oldIdea, newIdea]] = await cursor.all();

    // if nothing was updated, throw error
    if (!newIdea) {
      const e = new Error('not updated');
      // if old idea was found, then user doesn't have sufficient writing rights,
      // otherwise idea not found
      e.code = (oldIdea) ? 403 : 404;
      throw e;
    }

    return newIdea;
  }

  /**
   * Read ideas with my tags
   */
  static async withMyTags(username, { offset, limit }) {

    const query = `
      // gather the ideas related to me
      FOR me IN users FILTER me.username == @username
        FOR t, ut IN 1..1 ANY me OUTBOUND userTag
          FOR i IN 1..1 ANY t INBOUND ideaTags
            LET relevance = ut.relevance
            LET tg = KEEP(t, 'tagname')
            SORT relevance DESC
            // collect found tags together
            COLLECT idea=i INTO collected KEEP relevance, tg
            LET c = (DOCUMENT(idea.creator))
            LET creator = MERGE(KEEP(c, 'username'), c.profile)
            // sort ideas by sum of relevances of related userTags
            LET relSum = SUM(collected[*].relevance)
            SORT relSum DESC
            // format for output
            LET ideaOut = MERGE(KEEP(idea, 'title', 'detail', 'created'), { id: idea._key}, { creator })
            LET tagsOut = collected[*].tg
            // limit
            LIMIT @offset, @limit
            // respond
            RETURN { idea: ideaOut, tags: tagsOut }`;
    const params = { username, offset, limit };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    // generate idea-tags ids, and add them as attributes to each idea
    // and return array of the ideas
    return out.map(({ idea, tags }) => {
      idea.ideaTags = tags.map(({ tagname }) => ({
        id: `${idea.id}--${tagname}`,
        idea,
        tag: { tagname }
      }));
      return idea;
    });
  }

}

module.exports = Idea;
