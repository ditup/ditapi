const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Contact extends Model {

  static async create({ from, to, trust, reference, message, confirmed, notified }) {
    const contact = schema({ trust, reference, message, confirmed, notified });
    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          LET unique = (from._id < to._id) ? CONCAT(from._id, '--', to._id) : CONCAT(to._id, '--', from._id)
          INSERT MERGE({ _from: from._id, _to: to._id, unique }, @contact) IN contacts
          LET contact = MERGE(KEEP(NEW, 'created', 'confirmed'), { trust: NEW.trust01, reference: NEW.reference01})
          LET userFrom = MERGE(KEEP(from, 'username'), from.profile)
          LET userTo = MERGE(KEEP(to, 'username'), to.profile)
          RETURN MERGE(contact, { from: userFrom }, { to: userTo })`;
    const params = { from, to, contact };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    if (out.length !== 1) {
      const e = new Error('some users not found');
      e.code = 404;
      throw e;
    }

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

  static async confirm(from, to, { trust, reference }) {
    // TODO remove the notified field when confirmed
    const query = `
      // first we get the contact between the users
      LET cu = (FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          FOR c IN contacts FILTER c._from == to._id AND c._to == from._id
            RETURN { c, from, to })
      // we find out whether it is unconfirmed
      LET c = (FOR c IN cu FILTER c.c.confirmed==false
        UPDATE c.c WITH {
          confirmed: true,
          trust10: @trust,
          reference10: @reference,
          confirmationTime: @confirmationTime,
          message: null
        } IN contacts OPTIONS { keepNull: false }
        LET userFrom = KEEP(c.from, 'username', 'profile')
        LET userTo = KEEP (c.to, 'username', 'profile')
        RETURN MERGE(KEEP(NEW, 'confirmed', 'confirmationTime'), { trust: NEW.trust10, reference: NEW.reference10, from: userFrom, to: userTo }))
      RETURN { c, cu }
    `;
    const params = { from, to, trust, reference, confirmationTime: Date.now() };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    const [{ c: [contact], cu: [unfilteredContact] }] = out;

    if (!unfilteredContact) {
      const e = new Error('no contact found');
      e.code = 404;
      throw e;
    }

    if (!contact) {
      const e = new Error('contact is already confirmed');
      e.code = 403;
      throw e;
    }

    return out[0];
  }
}

module.exports = Contact;
