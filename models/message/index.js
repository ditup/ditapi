const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Message extends Model {

  /**
   * create a new message
   *
   */
  static async create({ from, to, body, created }) {
    const message = schema({ body, created });
    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          INSERT MERGE({ _from: from._id, _to: to._id }, @message) IN messages
          LET message = MERGE(KEEP(NEW, 'body', 'created'), { id: NEW._key})
          LET userFrom = MERGE(KEEP(from, 'username'), from.profile)
          LET userTo = MERGE(KEEP(to, 'username'), to.profile)
          RETURN MERGE(message, { from: userFrom }, { to: userTo })`;
    const params = { from, to, message };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    if (out.length !== 1) return null;
    return out[0];
  }

  static async read(id) {
    const query = `
      FOR msg IN messages FILTER msg._key == @id
        LET from = (FOR u IN users FILTER u._id == msg._from
          RETURN MERGE(KEEP(u, 'username'), u.profile))[0]
        LET to = (FOR u IN users FILTER u._id == msg._to
          RETURN MERGE(KEEP(u, 'username'), u.profile))[0]
        LET message = MERGE(KEEP(msg, 'body', 'created'), { id: msg._key})
        RETURN MERGE(message, { from }, { to })
      `;
    const params = { id };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();
    return out[0];
  }

}

module.exports = Message;
