const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Contact extends Model {

  static async create({ from, to, trust, reference, message, isConfirmed, notified }) {
    const contact = schema({ trust, reference, message, isConfirmed, notified });
    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          LET unique = (from._id < to._id) ? CONCAT(from._id, '--', to._id) : CONCAT(to._id, '--', from._id)
          INSERT MERGE({ _from: from._id, _to: to._id, unique }, @contact) IN contacts
          LET contact = MERGE(KEEP(NEW, 'created', 'isConfirmed', 'confirmed'), { trust: NEW.trust01, reference: NEW.reference01})
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
            FILTER [c._from, c._to] ALL IN [from._id, to._id]
      LET userFrom = KEEP(from, 'username', 'profile')
      LET userTo = KEEP(to, 'username', 'profile')
      LET contact = MERGE(
        KEEP(c, 'created', 'confirmed', 'isConfirmed', 'message'),
        {
          reference: (c._from == from._id) ? c.reference01 : c.reference10,
          trust: (c._from == from._id) ? c.trust01 : c.trust10,
          creator: (c._from == from._id) ? userFrom : userTo,
          from: userFrom,
          to: userTo
        }
      )
      RETURN contact
      `;
    const params = { from, to };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();
    if (out.length === 0) {
      const e = new Error('no contact found');
      e.code = 404;
      throw e;
    }
    return out[0];
  }

  /**
   * read contacts going from XOR to a specified user
   * either from or to parameter must be provided, but not both
   * @param {string} from - username
   * @param {string} to - username
   * @param {boolean}
   *
   */
  static async filter({ from, to, includeUnconfirmed }) {
    if ((!from && !to) || (from && to)) throw new Error('provide from XOR to');
    includeUnconfirmed = includeUnconfirmed || false;
    const filterConfirmed = (includeUnconfirmed) ? '' : 'AND c.isConfirmed == true';
    const queryFrom = `
      FOR from IN users FILTER from.username == @from
        FOR c IN contacts
          FILTER from._id IN [c._from, c._to] ${filterConfirmed}
          LET userFrom = KEEP(from, 'username', 'profile')
          LET to = (from._id == c._from) ? DOCUMENT(c._to) : DOCUMENT(c._from)
          LET userTo = KEEP(to, 'username', 'profile')
          LET contact = MERGE(
            KEEP(c, 'created', 'confirmed', 'isConfirmed'),
            {
              reference: (c._from == from._id) ? c.reference01 : c.reference10,
              trust: (c._from == from._id) ? c.trust01 : c.trust10,
              from: userFrom,
              to: userTo,
              creator: (c._from == from._id) ? userFrom : userTo
            }
          )
          RETURN contact
      `;
    const paramsFrom = { from };

    const queryTo = `
      FOR to IN users FILTER to.username == @to
        FOR c IN contacts
          FILTER to._id IN [c._from, c._to] ${filterConfirmed}
          LET userTo = KEEP(to, 'username', 'profile')
          LET from = (to._id == c._to) ? DOCUMENT(c._from) : DOCUMENT(c._to)
          LET userFrom = KEEP(from, 'username', 'profile')
          LET contact = MERGE(
            KEEP(c, 'created', 'confirmed', 'isConfirmed'),
            {
              reference: (c._from == from._id) ? c.reference01 : c.reference10,
              trust: (c._from == from._id) ? c.trust01 : c.trust10,
              from: userFrom,
              to: userTo,
              creator: (c._from == from._id) ? userFrom : userTo
            }
          )
          RETURN contact
      `;
    const paramsTo = { to };

    const query = (from) ? queryFrom : queryTo;
    const params = (from) ? paramsFrom : paramsTo;

    const cursor = await this.db.query(query, params);
    const out = await cursor.all();
    return out;
  }

  static async readUnnotified() {
    const query = `
      FOR c IN contacts FILTER c.notified != true AND c.isConfirmed != true
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

  /**
   * Update a contact
   * @param {string} from - username of contact originator (i.e. who provided the trust & reference & message we update)
   * @param {string} to - username of contact receiver
   * @param {Object} contact - the contact object to update
   * @param {number} [contact.trust]
   * @param {string} [contact.reference]
   * @param {string} [contact.message]
   * @returns Object the updated contact object
   */
  static async update(from, to, { trust, reference, message }) {
    const update01 = {
      trust01: trust,
      reference01: reference,
      message
    };

    const update10 = {
      trust10: trust,
      reference10: reference,
      message
    };

    const isMessageProvided = message !== undefined;

    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          LET cUnfiltered = (FOR c IN contacts FILTER (c._from == from._id && c._to == to._id) OR (c._from == to._id && c._to == from._id) RETURN c)
          LET cAllowed = (FOR c IN cUnfiltered
            FILTER c.isConfirmed OR c._from == from._id
            RETURN c)

          LET c = (FOR c IN cAllowed FILTER !c.isConfirmed OR !@isMessageProvided
            LET updateObj = (c._from == from._id)
              ? @update01
              : @update10
            UPDATE c WITH updateObj IN contacts
            RETURN NEW)
          RETURN { c, cUnfiltered, cAllowed }
    `;
    const params = { from, to, update01, update10, isMessageProvided };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    const [{ c: [c], cUnfiltered: [cUnfiltered], cAllowed: [cAllowed] }] = out;

    if (!cUnfiltered) {
      const e = new Error('contact doesn\'t exist');
      e.status = 404;
      throw e;
    }

    if (!cAllowed) {
      const e = new Error('you can\'t update the contact you didn\'t confirm');
      e.status = 400;
      throw e;
    }

    if (!c) {
      const e = new Error('you can\'t change a message of a confirmed contact');
      e.status = 400;
      throw e;
    }

    return c;
  }

  static async confirm(from, to, { trust, reference }) {
    const query = `
      // first we get the contact between the users
      LET cu = (FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          FOR c IN contacts FILTER c._from == to._id AND c._to == from._id
            RETURN { c, from, to })
      // we find out whether it is unconfirmed
      LET c = (FOR c IN cu FILTER c.c.isConfirmed==false
        UPDATE c.c WITH {
          isConfirmed: true,
          notified: null, // not needed anymore
          trust10: @trust,
          reference10: @reference,
          confirmed: @confirmationTime,
          message: null // not needed anymore
        } IN contacts OPTIONS { keepNull: false }
        LET userFrom = KEEP(c.from, 'username', 'profile')
        LET userTo = KEEP (c.to, 'username', 'profile')
        RETURN MERGE(KEEP(NEW, 'confirmed', 'isConfirmed'), { trust: NEW.trust10, reference: NEW.reference10, from: userFrom, to: userTo }))
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

  static async remove(from, to) {
    const query = `
      FOR from IN users FILTER from.username == @from
        FOR to IN users FILTER to.username == @to
          FOR c IN contacts
            FILTER [c._from, c._to] ALL IN [from._id, to._id]
            REMOVE c IN contacts
            RETURN OLD
      `;
    const params = { from, to };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    if (out.length === 0) {
      const e = new Error('no contact found');
      e.code = 404;
      throw e;
    }

    return;
  }
}

module.exports = Contact;
