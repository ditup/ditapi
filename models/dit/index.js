const _ = require('lodash'),
      path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Idea extends Model {

  /**
   * Create an idea
   */
  static async create(ditType, { title, detail, created, creator }) {
    // create the idea
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
   * Read the idea by id (_key in db).
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
   * Update an idea
   */
  static async update(ditType, id, newData, username) {
    const dit = _.pick(newData, ['title', 'detail']);
    const ditCollection = ditType + 's';

    const query = `
      // read [user]
      LET us = (FOR u IN users FILTER u.username == @username RETURN u)
      // read [idea]
      LET is = (FOR i IN @@ditCollection FILTER i._key == @id RETURN i)
      // update idea if and only if user matches idea creator
      LET newis = (
        FOR i IN is FOR u IN us FILTER u._id == i.creator
          UPDATE i WITH @dit IN @@ditCollection
          LET creator = MERGE(KEEP(u, 'username'), u.profile)
          RETURN MERGE(KEEP(NEW, 'title', 'detail', 'created'), { id: NEW._key }, { creator })
      )
      // return old and new idea (to decide what is the error)
      RETURN [is[0], newis[0]]`;
    const params = { id, dit, username, '@ditCollection': ditCollection };
    const cursor = await this.db.query(query, params);
    const [[oldDit, newDit]] = await cursor.all();

    // if nothing was updated, throw error
    if (!newDit) {
      const e = new Error('not updated');
      // if old idea was found, then user doesn't have sufficient writing rights,
      // otherwise idea not found
      e.code = (oldDit) ? 403 : 404;
      throw e;
    }

    return newDit;
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

  /**
   * Read ideas with tags
   * @param {string[]} tagnames - list of tagnames to search with
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Idea[]>} - list of found ideas
   */
  static async withTags(tagnames, { offset, limit }) {
    const query = `
      // find the provided tags
      FOR t IN tags FILTER t.tagname IN @tagnames
        SORT t.tagname
        LET tg = KEEP(t, 'tagname')
        // find the related ideas
        FOR i IN 1..1 ANY t INBOUND ideaTags
          // collect tags of each idea together
          COLLECT idea=i INTO collected KEEP tg
          // sort ideas by amount of matched tags, and from oldest
          SORT LENGTH(collected) DESC, idea.created ASC
          // read and format creator
          LET c = (DOCUMENT(idea.creator))
          LET creator = MERGE(KEEP(c, 'username'), c.profile)
          // format for output
          LET ideaOut = MERGE(KEEP(idea, 'title', 'detail', 'created'), { id: idea._key}, { creator })
          LET tagsOut = collected[*].tg
          // limit
          LIMIT @offset, @limit
          // respond
          RETURN { idea: ideaOut, tags: tagsOut }`;
    const params = { tagnames, offset, limit };
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

  /**
   * Read new ideas
   */
  static async findNew({ offset, limit }) {

    const query = `
      FOR idea IN ideas
        // sort from newest
        SORT idea.created DESC
        LIMIT @offset, @limit
        // find creator
        LET c = (DOCUMENT(idea.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        // format for output
        LET ideaOut = MERGE(KEEP(idea, 'title', 'detail', 'created'), { id: idea._key}, { creator })
        // limit
        // respond
        RETURN ideaOut`;
    const params = { offset, limit };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }

  /**
   * Read random ideas
   * @param {number} [limit] - max amount of random ideas to return
   */
  static async random({ limit }) {

    const query = `
      FOR idea IN ideas
        // sort from newest
        SORT RAND()
        LIMIT @limit
        // find creator
        LET c = (DOCUMENT(idea.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        // format for output
        LET ideaOut = MERGE(KEEP(idea, 'title', 'detail', 'created'), { id: idea._key}, { creator })
        // limit
        // respond
        RETURN ideaOut`;
    const params = { limit };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }

  /**
   * Read ideas with specified creators
   * @param {string[]} usernames - list of usernames to search with
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Idea[]>} - list of found ideas
   */
  static async findWithCreators(creators, { offset, limit }) {
    // TODO  to be checked for query optimization or unnecessary things
    const query = `
      LET creators = (FOR u IN users FILTER u.username IN @creators RETURN u)
        FOR idea IN ideas FILTER idea.creator IN creators[*]._id
            // find creator
            LET c = (DOCUMENT(idea.creator))
            // format for output
            LET creator = MERGE(KEEP(c, 'username'), c.profile)
            LET ideaOut = MERGE(KEEP(idea, 'title', 'detail', 'created'), { id: idea._key}, { creator })
            // sort from newest
            SORT idea.created DESC
            // limit
            LIMIT @offset, @limit
            // respond
            RETURN ideaOut`;

    const params = { offset, limit , creators };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }


  /**
   * Read ideas commented by specified users
   * @param {string[]} usernames - list of usernames to search with
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Idea[]>} - list of found ideas
   */
  static async findCommentedBy(commentedBy, { offset, limit }) {

    const query = `
      FOR user IN users 
      FILTER user.username IN @commentedBy
        FOR comment IN comments 
        FILTER comment.creator == user._id 
        AND IS_SAME_COLLECTION('ideas', comment.primary)
          FOR idea IN ideas 
          FILTER idea._id == comment.primary
          COLLECT i = idea
          // sort from newest
          SORT i.created DESC
          LIMIT @offset, @limit
      RETURN i`;

    const params = { commentedBy, offset, limit };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }


  /**
   * Read highly voted ideas
   * @param {string[]} voteSumBottomLimit - minimal query voteSum
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Idea[]>} - list of found ideas
   */
  static async findHighlyVoted(voteSumBottomLimit, { offset, limit }) {
    const query = `
      FOR idea IN ideas
        LET ideaVotes = (FOR vote IN votes FILTER idea._id == vote._to RETURN vote)
        // get sum of each idea's votes values
        LET voteSum = SUM(ideaVotes[*].value)
        // set bottom limit of voteSum
        FILTER voteSum >= @voteSumBottomLimit
        // find creator
        LET c = (DOCUMENT(idea.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        LET ideaOut = MERGE(KEEP(idea, 'title', 'detail', 'created'), { id: idea._key}, { creator }, { voteSum })

        // sort by amount of votes
        SORT ideaOut.voteSum DESC,  ideaOut.created DESC
        LIMIT @offset, @limit
        RETURN ideaOut`;

    const params = { voteSumBottomLimit, offset, limit };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }


  /**
   * Read trending ideas
   * @param {integer} offset - pagination offset
   * @param {integer} limit - pagination limit
   * @returns {Promise<Idea[]>} - list of found ideas
   */
  static async findTrending({ offset, limit }) {
    const now = Date.now();
    const oneWeek = 604800000; // 1000 * 60 * 60 * 24 * 7
    const threeWeeks = 1814400000; // 1000 * 60 * 60 * 24 * 21
    const threeMonths = 7776000000; // 1000 * 60 * 60 * 24 * 90
    const weekAgo = now - oneWeek;
    const threeWeeksAgo = now - threeWeeks;
    const threeMonthsAgo = now - threeMonths;

    // for each idea we are counting 'rate'
    // rate is the sum of votes/day in the last three months
    // votes/day from last week are taken with wage 3
    // votes/day from two weeks before last week are taken with wage 2
    // votes/day from the rest of days are taken with wage 1
    const query = `
      FOR idea IN ideas
        FOR vote IN votes
        FILTER idea._id == vote._to
        // group by idea id
        COLLECT id = idea
        // get sum of each idea's votes values from last week, last three weeks and last three months
        AGGREGATE rateWeek = SUM((vote.value * TO_NUMBER( @weekAgo <= vote.created))/7),
                rateThreeWeeks  = SUM((vote.value * TO_NUMBER( @threeWeeksAgo <= vote.created  && vote.created <= @weekAgo))/14),
                rateThreeMonths = SUM((vote.value * TO_NUMBER( @threeMonthsAgo <= vote.created  && vote.created <= @threeWeeksAgo))/69)
        // find creator
        LET c = (DOCUMENT(id.creator))
        LET creator = MERGE(KEEP(c, 'username'), c.profile)
        LET ideaOut = MERGE(KEEP(id, 'title', 'detail', 'created'), { id: id._key}, { creator })
        LET rates = 3*rateWeek + 2*rateThreeWeeks + rateThreeMonths
        FILTER rates > 0
        // sort by sum of rates
        SORT rates DESC
        LIMIT @offset, @limit
        RETURN ideaOut`;

    const params = { weekAgo, threeWeeksAgo, threeMonthsAgo, offset, limit };
    const cursor = await this.db.query(query, params);
    return await cursor.all();
  }
}


module.exports = Idea;
