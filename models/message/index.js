const path = require('path');

const schema = require('./schema');

const Model = require(path.resolve('./models/model'));

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

  /**
   * Read messages between two provided users
   * @param {string} username1 - username of one user
   * @param {string} username2 - username of other user
   * @returns {Promise<Message[]>} - array of the found messages
   *
   * TODO pagination
   */
  static async readThread(username1, username2) {
    if (username1 === username2)
      throw new Error('Usernames must be different #aoiuw9');

    const query = `
      LET user1 = (FOR u IN users FILTER u.username == @username1 RETURN u)[0]
      LET user2 = (FOR u IN users FILTER u.username == @username2 RETURN u)[0]

      LET thread = (
        FOR msg IN messages FILTER
          (msg._from == user1._id AND msg._to == user2._id) OR
          (msg._to == user1._id AND msg._from == user2._id)

          LET from_ = (msg._from == user1._id) ? user1 : user2
          LET to_ = (msg._to == user1._id) ? user1 : user2
          LET from = MERGE(KEEP(from_, 'username'), from_.profile)
          LET to = MERGE(KEEP(to_, 'username'), to_.profile)

          LET message = MERGE(KEEP(msg, 'body', 'created', 'read'), { id: msg._key})
          SORT message.created DESC
          RETURN MERGE(message, { from }, { to })
      )
      RETURN {
        thread: thread,
        user1: user1,
        user2: user2
      }
      `;
    const params = { username1, username2 };
    const cursor = await this.db.query(query, params);
    const { user1, user2, thread } = (await cursor.all())[0];

    // if one of the users doesn't exist, throw 404 error
    const usersExist = Boolean(user1) && Boolean(user2);
    if (!usersExist) {
      const nonexistent = (!user1) ? username1 : username2;
      const e = new Error(`User ${nonexistent} doesn't exist.`);
      e.status = 404;
      throw e;
    }

    return thread;
  }

  /**
   * Read last messages in my conversations/threads
   * @param {string} username - username
   * @returns {Promise<Message[]>} - array of the found messages
   */
  static async readThreads(username) {

    const query = `
      // find myself
      FOR u IN users FILTER u.username == @username

        // find all the messages from or to myself
        FOR msg IN messages FILTER msg._from == u._id OR msg._to == u._id

          // put together messages between me and 1 person
          // the latest will be first
          SORT msg.created DESC
          // who is the other user?
          LET otherUser = msg._from == u._id ? msg._to : msg._from
          COLLECT ou=otherUser INTO asdf KEEP msg

          // the latest message of the thread
          LET msg = asdf[0].msg

          // the latest thread will be last
          SORT msg.created DESC

          // get the sender
          LET from = (FOR usr IN users FILTER usr._id == msg._from
            RETURN MERGE(KEEP(usr, 'username'), usr.profile))[0]
          // get the receiver
          LET to = (FOR usr IN users FILTER usr._id == msg._to
            RETURN MERGE(KEEP(usr, 'username'), usr.profile))[0]

          RETURN MERGE(KEEP(msg, 'body', 'created', 'read'),
            { id: msg._key},
            { from },
            { to })
      `;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const threads = await cursor.all();

    return threads;
  }

  static async countUnreadThreads(username) {
    const query = `
      LET threads = (FOR u IN users FILTER u.username == @username
        FOR msg IN messages FILTER msg.read != true AND msg._to == u._id
          COLLECT fromid = msg._from, toid = msg._to
          RETURN fromid)
      RETURN COUNT(threads)
    `;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const count = (await cursor.all())[0];

    return count;

  }

  static async readUnnotified() {
    const query = `
      FOR msg IN messages FILTER msg.notified != true
        SORT msg.created ASC
        COLLECT fromid = msg._from, toid = msg._to INTO asdf
        LET to = KEEP(DOCUMENT(toid), 'username', 'email', 'profile')
        LET from = KEEP(DOCUMENT(fromid), 'username', 'email', 'profile')
        LET messages = asdf[*].msg
        
        RETURN { messages, from, to }
    `;
    const cursor = await this.db.query(query);
    const unnotified = await cursor.all();

    return unnotified;
  }

  /**
   * @param {string[]} ids: ids of messages to update to notified: true
   *
   */
  static async updateNotified(ids) {
    const query = `
      FOR msg IN messages FILTER msg.id IN @ids
        UPDATE msg WITH { notified: true } IN messages
        RETURN MERGE(NEW, {id: NEW._key})
    `;
    const params = { ids };

    const cursor = await this.db.query(query, params);
    const notified = await cursor.all();

    return notified;
  }

  static async updateRead(id, receiver) {
    const query = `
      LET msg = (FOR u IN users FILTER u.username == @receiver
        FOR msg IN messages FILTER msg._key == @id
          AND msg._to == u._id AND !msg.read
          RETURN msg)[0]
      LET updated = (FOR msgup IN messages
        FILTER msgup._from == msg._from AND msgup._to == msg._to
          AND msgup.created <= msg.created
          AND !msgup.read
        UPDATE msgup WITH { read: true } IN messages
        RETURN MERGE(NEW, {id: NEW._key}))
      // when the original message was not found (bad id or receiver doesn't fit)
      // return 403 Not Authorized
      RETURN msg ? updated : 403
    `;
    const params = { id, receiver };

    const cursor = await this.db.query(query, params);
    const read = (await cursor.all())[0];

    if (read === 403) {
      const err = new Error('Not Authorized');
      err.status = 403;
      throw err;
    }

    return read;
  }

}

module.exports = Message;
