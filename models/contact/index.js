const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Contact extends Model {

  static async create({ from, to, trust, reference, message }) {
    const contact = schema({ trust, reference, message });
    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          LET unique = (from._id < to._id) ? CONCAT(from._id, '--', to._id) : CONCAT(to._id, '--', from._id)
          INSERT MERGE({ _from: from._id, _to: to._id, unique }, @contact) IN contacts
          LET contact = KEEP(NEW, 'created', 'trust', 'reference', 'confirmed')
          LET userFrom = MERGE(KEEP(from, 'username'), from.profile)
          LET userTo = MERGE(KEEP(to, 'username'), to.profile)
          RETURN MERGE(contact, { from: userFrom }, { to: userTo })`;
    const params = { from, to, contact };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    if (out.length !== 1) return null;

    return out[0];
  }

  static async read(from, to) {
    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          FOR c IN contacts
            FILTER CONTAINS([from, to], c._from)
            AND CONTAINS([from, to], c._to)
      RETURN c
      `;
    const params = { from, to };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();
    return out[0];
  }

  static async readUnnotified() {
    const query = `
      FOR c IN contacts FILTER c.notified != true AND c.confirmed != true
        LET to = KEEP(DOCUMENT(c._to), 'username', 'email', 'profile')
        LET from = KEEP(DOCUMENT(c._from), 'username', 'email', 'profile')
        
        RETURN MERGE(c, { from, to })
    `;
    const cursor = await this.db.query(query);
    const unnotified = await cursor.all();

    return unnotified;
  }

  /**
   *
   */
  static async updateNotified(from, to) {
    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          FOR c IN contacts FILTER c._from == from._id AND c._to == to._id
        UPDATE c WITH { notified: true } IN contacts
        RETURN NEW
    `;
    const params = { from, to };

    const cursor = await this.db.query(query, params);
    const notified = await cursor.all();

    return notified;
  }
}

module.exports = Contact;
