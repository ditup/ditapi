const _ = require('lodash'),
      path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Dit extends Model {

  /**
   * Create an dit
   */
  static async create(ditType, { title, detail, created, creator }) {
    // create the dit
    const dit = schema({ title, detail, created });
    const ditCollection = ditType + 's';
    const query = `
      FOR u IN users FILTER u.username == @creator
        INSERT MERGE(@dit, { creator: u._id }) IN @@ditCollection
        LET creator = MERGE(KEEP(u, 'username'), u.profile)
        LET savedDit = MERGE(KEEP(NEW, 'title', 'detail', 'created'), { id: NEW._key }, { creator })
        RETURN savedDit`;
    const params = { creator, dit, '@ditCollection': ditCollection };

    const cursor = await this.db.query(query, params);

    const out = await cursor.all();

    if (out.length !== 1) return null;

    return out[0];
  }

  /**
   * Read the dit by id (_key in db).
   */
  static async read(ditType, id) {
    const ditCollection = ditType + 's';

    const query = `
      FOR i IN @@ditCollection FILTER i._key == @id
        LET creator = (FOR u IN users FILTER u._id == i.creator
          RETURN MERGE(KEEP(u, 'username'), u.profile))[0]
        RETURN MERGE(KEEP(i, 'title', 'detail', 'created'), { id: i._key}, { creator })`;
    const params = { id, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();
    return out[0];

  }

  /**
   * Update an dit
   */
  static async update(ditType, id, newData, username) {
    const dit = _.pick(newData, ['title', 'detail']);
    const ditCollection = ditType + 's';

    const query = `
      // read [user]
      LET us = (FOR u IN users FILTER u.username == @username RETURN u)
      // read [dit]
      LET is = (FOR i IN @@ditCollection FILTER i._key == @id RETURN i)
      // update dit if and only if user matches dit creator
      LET newis = (
        FOR i IN is FOR u IN us FILTER u._id == i.creator
          UPDATE i WITH @dit IN @@ditCollection
          LET creator = MERGE(KEEP(u, 'username'), u.profile)
          RETURN MERGE(KEEP(NEW, 'title', 'detail', 'created'), { id: NEW._key }, { creator })
      )
      // return old and new dit (to decide what is the error)
      RETURN [is[0], newis[0]]`;
    const params = { id, dit, username, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    const [[oldDit, newDit]] = await cursor.all();

    // if nothing was updated, throw error
    if (!newDit) {
      const e = new Error('not updated');
      // if old dit was found, then user doesn't have sufficient writing rights,
      // otherwise dit not found
      e.code = (oldDit) ? 403 : 404;
      throw e;
    }

    return newDit;
  }

  /**
   * Read dits with my tags
   */
  static async withMyTags(ditType, username, { offset, limit }) {
    const ditTags = ditType + 'Tags';
    const query = `
      // gather the dits related to me
      FOR me IN users FILTER me.username == @username
        FOR t, ut IN 1..1 ANY me OUTBOUND userTag
          FOR i IN 1..1 ANY t INBOUND @@ditTags
            LET relevance = ut.relevance
            LET tg = KEEP(t, 'tagname')
            SORT relevance DESC
            // collect found tags together
            COLLECT ${ditType}=i INTO collected KEEP relevance, tg
            LET c = (DOCUMENT(${ditType}.creator))
            LET creator = MERGE(KEEP(c, 'username'), c.profile)
            // sort dits by sum of relevances of related userTags
            LET relSum = SUM(collected[*].relevance)
            SORT relSum DESC
            // format for output
            LET ${ditType}Out = MERGE(KEEP(${ditType}, 'title', 'detail', 'created'), { id: ${ditType}._key}, { creator })
            LET tagsOut = collected[*].tg
            // limit
            LIMIT @offset, @limit
            // respond
            RETURN { dit: ${ditType}Out, tags: tagsOut }`;
    const params = { username, offset, limit, '@ditTags': ditTags };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    // generate dit-tags ids, and add them as attributes to each dit
    // and return array of the dits
    return out.map(({ dit, tags }) => {
      dit[`${ditType}Tags`] = tags.map(({ tagname }) => ({
        id: `${dit.id}--${tagname}`,
        [`${ditType}`]: dit,
        tag: { tagname }
      }));
      return dit;
    });
  }

  /**
   * Read dits with tags
   * @param {string[]} tagnames - list of tagnames to search with
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Dit[]>} - list of found dits
   */
  static async withTags(ditType, tagnames, { offset, limit }) {
    const ditTags = ditType + 'Tags';
    const query = `
      // find the provided tags
      FOR t IN tags FILTER t.tagname IN @tagnames
        SORT t.tagname
        LET tg = KEEP(t, 'tagname')
        // find the related dits
        FOR i IN 1..1 ANY t INBOUND @@ditTags
          // collect tags of each dit together
          COLLECT ${ditType}=i INTO collected KEEP tg
          // sort dits by amount of matched tags, and from oldest
          SORT LENGTH(collected) DESC, ${ditType}.created ASC
          // read and format creator
          LET c = (DOCUMENT(${ditType}.creator))
          LET creator = MERGE(KEEP(c, 'username'), c.profile)
          // format for output
          LET ${ditType}Out = MERGE(KEEP(${ditType}, 'title', 'detail', 'created'), { id: ${ditType}._key}, { creator })
          LET tagsOut = collected[*].tg
          // limit
          LIMIT @offset, @limit
          // respond
          RETURN { dit: ${ditType}Out, tags: tagsOut }`;
    const params = { tagnames, offset, limit, '@ditTags': ditTags };
    const cursor = await this.db.query(query, params);
    const out = await cursor.all();

    // generate dit-tags ids, and add them as attributes to each dit
    // and return array of the dits
    return out.map(({ dit, tags }) => {
      dit[`${ditType}Tags`] = tags.map(({ tagname }) => ({
        id: `${dit.id}--${tagname}`,
        [`${ditType}`]: dit,
        tag: { tagname }
      }));
      return dit;
    });
  }

  /**
   * Read new dits
   */
  static async findNew(ditType, { offset, limit }) {
    const ditCollection = ditType + 's';
    const query = `
      FOR ${ditType} IN @@ditCollection
        // sort from newest
        SORT ${ditType}.created DESC
        LIMIT @offset, @limit
        // find creator
        LET c = (DOCUMENT(${ditType}.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        // format for output
        LET ditOut = MERGE(KEEP(${ditType}, 'title', 'detail', 'created'), { id: ${ditType}._key}, { creator })
        // limit
        // respond
        RETURN ditOut`;
    const params = { offset, limit, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }

  /**
   * Read random dits
   * @param {number} [limit] - max amount of random dits to return
   */
  static async random(ditType, { limit }) {
    const ditCollection = ditType + 's';
    const query = `
      FOR ${ditType} IN @@ditCollection
        // sort from newest
        SORT RAND()
        LIMIT @limit
        // find creator
        LET c = (DOCUMENT(${ditType}.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        // format for output
        LET ditOut = MERGE(KEEP(${ditType}, 'title', 'detail', 'created'), { id: ${ditType}._key}, { creator })
        // limit
        // respond
        RETURN ditOut`;
    const params = { limit, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }

  /**
   * Read dits with specified creators
   * @param {string[]} usernames - list of usernames to search with
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Dit[]>} - list of found dits
   */
  static async findWithCreators(ditType, creators, { offset, limit }) {
    // TODO  to be checked for query optimization or unnecessary things
    const ditCollection = ditType + 's';
    const query = `
      LET creators = (FOR u IN users FILTER u.username IN @creators RETURN u)
        FOR ${ditType} IN @@ditCollection FILTER ${ditType}.creator IN creators[*]._id
            // find creator
            LET c = (DOCUMENT(${ditType}.creator))
            // format for output
            LET creator = MERGE(KEEP(c, 'username'), c.profile)
            LET ditOut = MERGE(KEEP(${ditType}, 'title', 'detail', 'created'), { id: ${ditType}._key}, { creator })
            // sort from newest
            SORT ${ditType}.created DESC
            // limit
            LIMIT @offset, @limit
            // respond
            RETURN ditOut`;

    const params = { offset, limit , creators, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }


  /**
   * Read dits commented by specified users
   * @param {string[]} usernames - list of usernames to search with
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Dit[]>} - list of found dits
   */
  static async findCommentedBy(ditType, commentedBy, { offset, limit }) {
    const ditCollection = ditType + 's';
    const query = `
      FOR user IN users 
      FILTER user.username IN @commentedBy
        FOR comment IN comments 
        FILTER comment.creator == user._id 
        AND IS_SAME_COLLECTION('${ditType}s', comment.primary)
          FOR ${ditType} IN @@ditCollection 
          FILTER ${ditType}._id == comment.primary
          COLLECT i = ${ditType}
          // sort from newest
          SORT i.created DESC
          LIMIT @offset, @limit
      RETURN i`;

    const params = { commentedBy, offset, limit, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }


  /**
   * Read highly voted dits
   * @param {string[]} voteSumBottomLimit - minimal query voteSum
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Dit[]>} - list of found dits
   */
  static async findHighlyVoted(ditType, voteSumBottomLimit, { offset, limit }) {
    const ditCollection = ditType + 's';
    const query = `
      FOR ${ditType} IN @@ditCollection
        LET ${ditType}Votes = (FOR vote IN votes FILTER ${ditType}._id == vote._to RETURN vote)
        // get sum of each dit's votes values
        LET voteSum = SUM(${ditType}Votes[*].value)
        // set bottom limit of voteSum
        FILTER voteSum >= @voteSumBottomLimit
        // find creator
        LET c = (DOCUMENT(${ditType}.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        LET ditOut = MERGE(KEEP(${ditType}, 'title', 'detail', 'created'), { id: ${ditType}._key}, { creator }, { voteSum })

        // sort by amount of votes
        SORT ditOut.voteSum DESC,  ditOut.created DESC
        LIMIT @offset, @limit
        RETURN ditOut`;

    const params = { voteSumBottomLimit, offset, limit, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }


  /**
   * Read trending dits
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Dit[]>} - list of found dits
   */
  static async findTrending(ditType, { offset, limit }) {
    const ditCollection = ditType + 's';

    const now = Date.now();
    const oneWeek = 604800000; // 1000 * 60 * 60 * 24 * 7
    const threeWeeks = 1814400000; // 1000 * 60 * 60 * 24 * 21
    const threeMonths = 7776000000; // 1000 * 60 * 60 * 24 * 90
    const weekAgo = now - oneWeek;
    const threeWeeksAgo = now - threeWeeks;
    const threeMonthsAgo = now - threeMonths;

    // for each dit we are counting 'rate'
    // rate is the sum of votes/day in the last three months
    // votes/day from last week are taken with wage 3
    // votes/day from two weeks before last week are taken with wage 2
    // votes/day from the rest of days are taken with wage 1
    const query = `
      FOR ${ditType} IN @@ditCollection
        FOR vote IN votes
        FILTER ${ditType}._id == vote._to
        // group by dit id
        COLLECT d = ${ditType}
        // get sum of each dit's votes values from last week, last three weeks and last three months
        AGGREGATE rateWeek = SUM((vote.value * TO_NUMBER( @weekAgo <= vote.created))/7),
                rateThreeWeeks  = SUM((vote.value * TO_NUMBER( @threeWeeksAgo <= vote.created  && vote.created <= @weekAgo))/14),
                rateThreeMonths = SUM((vote.value * TO_NUMBER( @threeMonthsAgo <= vote.created  && vote.created <= @threeWeeksAgo))/69)
        // find creator
        LET c = (DOCUMENT(d.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        LET ditOut = MERGE(KEEP(d, 'title', 'detail', 'created'), { id: d._key}, { creator })
        LET rates = 3*rateWeek + 2*rateThreeWeeks + rateThreeMonths
        FILTER rates > 0
        // sort by sum of rates
        SORT rates DESC
        LIMIT @offset, @limit
        RETURN ditOut`;

    const params = { weekAgo, threeWeeksAgo, threeMonthsAgo, offset, limit, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }

  /**
   * Read dits with any of specified keywords in the title
   * @param {string[]} keywords - list of keywords to search with
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Dit[]>} - list of found dits
   */
  static async findWithTitleKeywords(ditType, keywords, { offset, limit }) {
    const ditCollection = ditType + 's';
    const query = `
          FOR ${ditType} IN @@ditCollection 
            LET search = ( FOR keyword in @keywords
                            RETURN TO_NUMBER(CONTAINS(${ditType}.title, keyword)))
            LET fit = SUM(search)
            FILTER fit > 0
            // find creator
            LET c = (DOCUMENT(${ditType}.creator))
            // format for output
            LET creator = MERGE(KEEP(c, 'username'), c.profile)
            LET ditOut = MERGE(KEEP(${ditType}, 'title', 'detail', 'created'), { id: ${ditType}._key}, { creator }, {fit})
            // sort from newest
            SORT fit DESC, ditOut.title
            // limit
            LIMIT @offset, @limit
            // respond
            RETURN ditOut`;

    const params = { 'keywords': keywords, offset, limit, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }
}


module.exports = Dit;
