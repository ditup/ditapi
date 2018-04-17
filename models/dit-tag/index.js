'use strict';

const path = require('path');

const Model = require(path.resolve('./models/model')),
      schema = require('./schema');
const ditsDictionary = { challenge: 'challenge', idea: 'idea' };


class DitTag extends Model {
  /**
   * Create ditTag in database
   */
  static async create(ditType, ditId, tagname, ditTagInput, creatorUsername) {
    // allow just particular strings for a ditType
    ditType = ditsDictionary[ditType];

    // generate standard ditTag
    const ditTag = await schema(ditTagInput);
    // / STOPPED
    const query = `
      // array of dits (1 or 0)
      LET ds = (FOR d IN ${ditType}s FILTER d._key == @ditId RETURN d)
      // array of dits (1 or 0)
      LET ts = (FOR t IN tags FILTER t.tagname == @tagname RETURN t)
      // array of users (1 or 0)
      LET us = (FOR u IN users FILTER u.username == @creatorUsername RETURN u)
      // create the ditTag (if dit, tag and creator exist)
      LET ${ditType}Tag = (FOR d IN ds FOR t IN ts FOR u IN us FILTER u._id == d.creator
        INSERT MERGE({ _from: d._id, _to: t._id, creator: u._id }, @ditTag) IN ${ditType}Tags RETURN KEEP(NEW, 'created'))[0] || { }
      // if ditTag was not created, default to empty object (to be able to merge later)
      // gather needed data
      LET creator = MERGE(KEEP(us[0], 'username'), us[0].profile)
      LET tag = KEEP(ts[0], 'tagname')
      LET ${ditType} = MERGE(KEEP(ds[0], 'title', 'detail'), { id: ds[0]._key })
      // return data
      RETURN MERGE(${ditType}Tag, { creator, tag, ${ditType} })`;

    const params = { ditId, tagname, ditTag, creatorUsername };

    const cursor = await this.db.query(query, params);

    const response = (await cursor.all())[0];

    switch (cursor.extra.stats.writesExecuted) {
      // ditTag was created
      case 1: {
        return response;
      }
      // ditTag was not created
      case 0: {
        throw generateError(response);
      }
    }

    function generateError(response) {
      let e;
      // check that dit, tag and creator exist
      // some of them don't exist, then ditTag was not created
      if (!(response[`${ditType}`] && response['tag'] && response['creator'])) {
        e = new Error('Not Found');
        e.code = 404;
        e.missing = [];

        [`${ditType}`, 'tag', 'creator'].forEach((potentialMissing) => {
          if (!response[potentialMissing]){
            e.missing.push(potentialMissing);
          }
        });
      } else {
        // if all exist, then dit creator !== ditTag creator, not authorized
        e = new Error('Not Authorized');
        e.code = 403;
      }

      return e;
    }

  }

  /**
   * Read ditTag from database
   */
  static async read(ditType, ditId, tagname) {
    const ditCollection = ditType + 's';
    const ditTags = ditType + 'Tags';
    // allow just particular strings for a ditType
    ditType = ditsDictionary[ditType];

    const query = `
      FOR t IN tags FILTER t.tagname == @tagname
        FOR d IN @@ditCollection FILTER d._key == @ditId
          FOR dt IN @@ditTags FILTER dt._from == d._id AND dt._to == t._id
            LET creator = (FOR u IN users FILTER u._id == dt.creator
              RETURN MERGE(KEEP(u, 'username'), u.profile))[0]
            LET ${ditType}Tag = KEEP(dt, 'created')
            LET tag = KEEP(t, 'tagname')
            LET ${ditType} = MERGE(KEEP(d, 'title', 'detail'), { id: d._key })
            RETURN MERGE(${ditType}Tag, { creator, tag, ${ditType} })`;
    const params = { ditId, tagname, '@ditCollection': ditCollection, '@ditTags': ditTags };
    const cursor = await this.db.query(query, params);

    return (await cursor.all())[0];
  }

  /**
   * Read tags of dit
   */
  static async readTagsOfDit(ditType, ditId) {
    const ditCollection = ditType + 's';
    const ditTag = ditType + 'Tags';
    // allow just particular strings for a ditType
    ditType = ditsDictionary[ditType];

    const query = `
      // read dit into array (length 1 or 0)
      LET ds = (FOR d IN @@ditCollection FILTER d._key == @ditId RETURN d)
      // read ditTags
      LET dts = (FOR d IN ds
        FOR dt IN @@ditTag FILTER dt._from == d._id
          FOR t IN tags FILTER dt._to == t._id
            SORT t.tagname
            LET ${ditType}Tag = KEEP(dt, 'created')
            LET tag = KEEP(t, 'tagname')
            LET ${ditType} = MERGE(KEEP(d, 'title', 'detail'), { id: d._key })
            RETURN MERGE(${ditType}Tag, { tag, ${ditType} })
      )
      RETURN { ${ditType}Tags: dts, ${ditType}: ds[0] }`;
    const params = { ditId, '@ditCollection': ditCollection, '@ditTag':ditTag };

    const cursor = await this.db.query(query, params);

    // const [{ dit, ditTags }] = await cursor.all();
    const ditTagsData = await cursor.all();
    // when dit not found, error
    if (!ditTagsData[0][`${ditType}`]) {
      const e = new Error(`${ditType} not found`);
      e.code = 404;
      throw e;
    }

    return ditTagsData[0][`${ditType}Tags`];
  }

  /**
   * Remove ditTag from database
   */
  static async remove(ditType, ditId, tagname, username) {
    const ditCollection = ditType + 's';
    const ditTags = ditType + 'Tags';
    // allow just particular strings for a ditType
    ditType = ditsDictionary[ditType];

    const query = `
      // find users (1 or 0)
      LET us = (FOR u IN users FILTER u.username == @username RETURN u)
      // find dits (1 or 0)
      LET ds = (FOR i IN @@ditCollection FILTER i._key == @ditId RETURN i)
      // find [ditTag] between dit and tag specified (1 or 0)
      LET dts = (FOR i IN ds
        FOR t IN tags FILTER t.tagname == @tagname
          FOR dt IN @@ditTags FILTER dt._from == i._id AND dt._to == t._id
            RETURN dt)
      // find and remove [ditTag] if and only if user is creator of dit
      // is user authorized to remove the ditTag in question?
      LET dtsdel = (FOR u IN us FOR d IN ds FILTER u._id == d.creator
        FOR dt IN dts
        REMOVE dt IN @@ditTags
        RETURN dt)
      // return [ditTag] between dit and tag
      RETURN dts`;

    const params = { ditId, tagname, username, '@ditTags': ditTags, '@ditCollection': ditCollection};

    // execute query and gather database response
    const cursor = await this.db.query(query, params);
    const [matchedDitTags] = await cursor.all();

    // return or error
    switch (cursor.extra.stats.writesExecuted) {
      // ditTag was removed: ok
      case 1: {
        return;
      }
      // ditTag was not removed: error
      case 0: {
        throw generateError(matchedDitTags);
      }
      // unexpected error
      default: {
        throw new Error('unexpected error');
      }
    }

    /**
     * When no ditTag was removed, it can have 2 reasons:
     * 1. ditTag was not found
     * 2. ditTag was found, but the user is not creator of the dit
     *    therefore is not authorized to do so
     */
    function generateError(response) {
      let e;
      if (response.length === 0) {
        // ditTag was not found
        e = new Error('not found');
        e.code = 404;
      } else {
        // ditTag was found, but user is not dit's creator
        e = new Error('not authorized');
        e.code = 403;
      }

      return e;
    }
  }
}

module.exports = DitTag;
