const path = require('path');

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

}

module.exports = Idea;
