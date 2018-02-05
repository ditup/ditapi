const path = require('path'),
      _ = require('lodash');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');

class Tag extends Model {

  /**
   * create a new tag
   *
   */
  static async create({ tagname, creator }) {
    // create the tag
    const tag = schema({ tagname });
    const query = `
      FOR u IN users FILTER u.username == @creator
        INSERT MERGE(@tag, { creator: u._id }) IN tags
          RETURN NEW`;
    const params = { tag, creator };

    await this.db.query(query, params);
  }

  static async read(tagname) {
    const query = `
      FOR t IN tags FILTER t.tagname == @tagname
        RETURN KEEP(t, 'tagname', 'created')`;
    const params = { tagname };
    const out = await (await this.db.query(query, params)).all();

    const tag = _.pick(out[0], 'tagname', 'created');

    return (out[0]) ? tag : null;
  }

  /**
   * Return an array of random tags
   * @param {number} [limit] - amount of tags to return, defaults to 1
   * @returns Promise<Tag[]> - returns array of tags
   */
  static async random(limit) {
    limit = limit || 1;
    const query = `
      FOR t IN tags
        SORT RAND()
        LIMIT @limit
        RETURN KEEP(t, 'tagname', 'created')
    `;
    const params = { limit };
    const out = await (await this.db.query(query, params)).all();
    return out;
  }

  /**
   * Return an array of popular tags by amount of uses
   * @param {number} [limit] - amount of tags to return, defaults to 1
   * @returns Promise<Tag[]> - returns array of tags
   */
  static async popularByUses(limit) {
    limit = limit || 10;
    const query = `
      FOR t IN tags
        LET userTags = (FOR v, e IN 1..1 ANY t INBOUND userTag RETURN e)
        LET uses = LENGTH(userTags)
        LET relevanceSum = SUM(userTags[*].relevance)
        SORT uses DESC, relevanceSum DESC, RAND()
        LIMIT @limit
        RETURN MERGE(KEEP(t, 'tagname'), { popularityByUses: uses })
    `;
    const params = { limit };
    const out = await (await this.db.query(query, params)).all();
    return out;
  }

  /**
   * check if given tag exists
   * @param {string} tagname - tagname to check
   * @returns Boolean
   */
  static async exists(tagname) {
    const query = `
      FOR t IN tags FILTER t.tagname == @tagname
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const params = { tagname };
    const count = await (await this.db.query(query, params)).next();

    switch (count) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('bad output');
    }
  }

  /**
   * Get tags which start with likeTagname string
   * @param {string} likeTagname
   */
  static async filter(likeTagname, { offset, limit }) {
    const query = `
      FOR t IN tags
        FILTER t.tagname LIKE CONCAT(@likeTagname, '%')
        OR     t.tagname LIKE CONCAT('%-', @likeTagname, '%')
        LIMIT @offset, @limit
        RETURN KEEP(t, 'username', 'tagname', 'created')`;
    // % serves as a placeholder for multiple characters in arangodb LIKE
    // _ serves as a placeholder for a single character
    const params = { likeTagname, offset, limit };
    const out = await (await this.db.query(query, params)).all();

    const formatted = [];

    for(const tag of out) {
      formatted.push(_.pick(tag, ['tagname']));
    }

    return formatted;
  }

  /**
   * Find tags related to tags of a user
   * @param {string} username - username of the user
   * @returns Promise<object[]> - array of the found tags (including relevance parameter)
   */
  static async findTagsRelatedToTagsOfUser(username, { offset, limit }) {
    const query = `
      FOR u IN users FILTER u.username == @username

        // find the tags of user (to later exclude them from results)
        LET utags = (FOR v IN 1..1 ANY u ANY userTag RETURN v.tagname)

        FOR v, e, p IN 3..3
          ANY u
          ANY userTag
          FILTER NOT(v.tagname IN utags) // filter out the tags of user

          // count the relevance for each found path
          // (geometric mean of edge relevances)
          LET relevanceWeight = POW(p.edges[0].relevance*p.edges[1].relevance*p.edges[2].relevance, 1/3)

          COLLECT tag = v INTO asdf KEEP relevanceWeight
          LET finalTag = KEEP(tag, 'tagname', 'created')
          // sum the relevance of found paths
          LET weightSum = SUM(asdf[*].relevanceWeight)
          SORT weightSum DESC
          LIMIT @offset, @limit
          RETURN MERGE(finalTag, { relevance: weightSum })
    `;
    const params = { username, offset, limit };
    const out = await (await this.db.query(query, params)).all();

    return out;
  }

  /**
   * Find tags related to given in tagsArray tags
   * @param {array} givenTags - tags given in tagsArray in request
   * @returns Promise<object[]> - array of the found tags (including relevance parameter)
   */
  static async findTagsRelatedToTags(tagsArray, { offset, limit }) {
    const query = `
      FOR sortedTag in (
        FOR t in tags FILTER t.tagname IN @givenTags // filter out given tags
          
          // find similar tags  - tags which have common user with given tags
          FOR v, e, p IN 2..2 
          ANY t
          userTag

          // count similarity for each found path
          // (geometric mean of edge relevances)
          // aggregate results by tags (vertices at the end of the paths)
          // and sum similarity by tags
          COLLECT foundTag = v AGGREGATE similarity = SUM(sqrt(p.edges[0].relevance * p.edges[1].relevance )) INTO u 
          RETURN {created: foundTag.tagname, tagname: foundTag.tagname, relevance: similarity }
      )
      FILTER sortedTag.tagname NOT IN @givenTags // filter out given tags from rsults
      SORT sortedTag.relevance DESC, sortedTag.tagname ASC // sort by relevance-similarity and by tagname if equal
      LIMIT @offset, @limit
      RETURN sortedTag
    `;
    const params = { givenTags: tagsArray, offset, limit };
    const out = await (await this.db.query(query, params)).all();
    return out;
  }

  /**
   * Delete unused tags:
   * Delete all tags which have no edges in ditup_graph
   */
  static async deleteAbandoned() {
    const query = `
      FOR t IN tags
        LET len = (FOR v IN 1..1 ANY t GRAPH 'ditup_graph'
          COLLECT WITH COUNT INTO a RETURN a)[0]
        FILTER len == 0
        REMOVE t IN tags RETURN KEEP(OLD, 'tagname')`;

    const cursor = await this.db.query(query);
    return await cursor.all();
  }

  /**
   * counts all tags
   */
  static async count() {
    const query = `
      FOR t IN tags
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const count = await (await this.db.query(query)).next();

    return count;
  }
}


module.exports = Tag;
