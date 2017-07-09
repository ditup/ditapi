'use strict';

const _ = require('lodash'),
      path = require('path');

const Model = require(path.resolve('./models/model')),
      account = require('./account'),
      helpers = require('./helpers'),
      schema = require('./schema');

class User extends Model {

  // save a new user to a database
  static async create(user) {
    // generate an email verification code
    const emailVerifyCode = await account.generateHexCode(32);
    user.emailVerifyCode = emailVerifyCode;

    // generate a user object in a standard shape
    user = await schema(user);

    // save the user into a database
    await this.db.query('INSERT @user IN users', { user });

    // return some information
    return { emailVerifyCode };
  }

  // read a user by username
  static async read(username) {
    const query = 'FOR u IN users FILTER u.username == @username RETURN u';
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output[0];
  }

  static async updateEmail(username, email) {
    // generate an email verification code
    const emailVerifyCode = await account.generateHexCode(32);

    // generate a user object in a standard shape
    const accountEmail = await schema.account.email({ email, emailVerifyCode });

    const query = `
      FOR u IN users FILTER u.username == @username
        LET account = MERGE(u.account, { email: @accountEmail })
        UPDATE u WITH { account } IN users
        RETURN NEW`;

    const params = { accountEmail, username };

    // save the user into a database
    await this.db.query(query, params);

    // return some information
    return { emailVerifyCode };
  }

  static async createPasswordResetCode(usernameOrEmail) {

    const code = await account.generateHexCode(32);
    const hashedCode = await account.hash(code);

    const query = `
      FOR u IN users FILTER (u.username == @usernameOrEmail
        OR u.email == @usernameOrEmail) AND TO_BOOL(u.email) == true
        UPDATE u WITH { account: MERGE(u.account, {
          password: {
            code: @hashedCode,
            codeExpire: @codeExpire
          }
        })} IN users
        RETURN { username: NEW.username, email: NEW.email }
    `;

    const params = { usernameOrEmail, hashedCode, codeExpire: Date.now() + 30 * 60 * 1000 };

    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    if (output.length < 1) {
      const unverifiedQuery = 'FOR u IN users FILTER (u.username == @usernameOrEmail) AND TO_BOOL(u.email) == false RETURN u';
      const unverifiedParams = { usernameOrEmail };

      const output = await (await this.db.query(unverifiedQuery, unverifiedParams)).all();

      if (output.length > 0) {
        throw new Error('User not verified');
      }

      throw new Error('User not found');
    }

    if (output.length > 1) {
      throw new Error('Multiple users, this should never happen.');
    }

    return { username: output[0].username, email: output[0].email, code };
  }

  static async checkPasswordResetCode(username, code) {
    const query = `
      FOR u IN users FILTER u.username == @username
        RETURN u.account.password`;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    // change default values when authenticated
    switch (output.length) {
      // when we found no user by the username, keep default values (not logged)
      case 0: {
        throw new Error('User not found');
      }
      case 1: {
        // check whether the provided password matches the hashed password from db
        const matchCode = await account.compare(code, output[0].code);

        if (!matchCode) throw new Error('Wrong code');

        const isExpired = output[0].codeExpire < Date.now();

        if (isExpired) throw new Error('Expired code');

        // if we're correct
        if (!isExpired && matchCode) return;

        break;
      }
      default: {
        throw new Error('Database Error: duplicate user');
      }
    }

    throw new Error('unexpected error');
  }

  static async update(username, newData) {
    const profile = _.pick(newData, ['givenName', 'familyName', 'description']);
    const query = `FOR u IN users FILTER u.username == @username
      UPDATE u WITH { profile: @profile } IN users
      RETURN NEW`;
    const params = { username, profile };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output[0];
  }

  static async updateLocation(username, rawLocation) {

    const preciseLocation = rawLocation || null;
    const location = (preciseLocation === null)
      ? null
      : helpers.randomizeLocation(preciseLocation);

    const query = `FOR u IN users FILTER u.username == @username
      UPDATE u WITH { location: @location, preciseLocation: @preciseLocation, locationUpdated: @locationUpdated } IN users
      RETURN NEW`;
    const params = {
      username,
      location,
      preciseLocation,
      locationUpdated: Date.now() };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output[0];
  }

  static async exists(username) {
    const query = `
      FOR u IN users FILTER u.username == @username
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const count = await cursor.next();

    switch (count) {
      case 0:
        return false;
      case 1:
        return true;
      default:
        throw new Error('bad output');
    }
  }

  // authenticate user provided username password combination
  static async authenticate(username, password) {
    // get information about the user from a database
    const query = `
      FOR u IN users FILTER u.username == @username
        RETURN {
          username: u.username,
          password: u.password,
          email: u.email,
          profile: u.profile
        }`;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    // default not authenticated values
    let credentialsMatch = false,
        isVerified = false,
        profile;

    // change default values when authenticated
    switch (output.length) {
      // when we found no user by the username, keep default values (not logged)
      case 0:
        break;
      // when a user was found
      case 1:
        // check whether the provided password matches the hashed password from db
        credentialsMatch = await account.compare(password, output[0].password);

        // user is verified when her email is present (otherwise only emailTemporary)
        isVerified = Boolean(output[0].email);

        // populate user's profile
        profile = _.pick(output[0].profile, ['givenName', 'familyName']);
        break;
      default:
        throw new Error('Database Error');
    }

    const user = {
      authenticated: credentialsMatch,
      verified: Boolean(isVerified && credentialsMatch)
    };

    if (credentialsMatch) {
      profile.username = username;
      _.assign(user, profile);
    }

    return user;
  }

  static async emailExists(email) {
    const query = `
      FOR u IN users FILTER u.email == @email
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const params = { email: email };
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

  // check whether the email verification code is correct
  // if correct, update temporary email to email and resolve
  // if incorrect, reject the promise
  static async verifyEmail(username, code) {
    // read the temporary email data
    const query = `
      FOR u IN users FILTER u.username == @username
        RETURN {
          email: u.account.email.temporary,
          code: u.account.email.code,
          codeExpire: u.account.email.codeExpire
        }
    `;
    const params = { username };
    const output = await (await this.db.query(query, params)).all();

    if(output.length === 0) throw new Error('User Not Found');
    if(output.length > 1) throw new Error('Database Corruption');

    const info = output[0];

    // check that we don't verify a verified email
    const isAlreadyVerified = !(info.email && info.code && info.codeExpire);
    if (isAlreadyVerified) throw {
      param: 'request',
      msg: 'user is already verified'
    };

    // check that the code is not yet expired
    const isCodeExpired = Date.now() > info.codeExpire;
    if (isCodeExpired) throw {
      param: 'code',
      msg: 'code is expired'
    };

    // chect that the code is correct
    const codeMatches = await account.compare(code, info.code);

    if (codeMatches !== true) throw {
      param: 'code',
      msg: 'code is wrong'
    };
    // if correct, put emailTemporary to email and erase all the rest
    // update the database: move emailTemporary to email and clean the data
    await this.finalVerifyEmail(username);
  }

  // finish email verification. move emailTemporary to email and clean
  static async finalVerifyEmail(username) {
    const query = `
      FOR u IN users FILTER u.username == @username
        UPDATE {
          _key: u._key,
          email: u.account.email.temporary,
          account: MERGE(u.account, { email: null })
        }
        IN users
    `;
    const params = { username };
    await this.db.query(query, params);
  }

  static async readTags(username) {
    const query = `
      FOR u IN users FILTER u.username == @username
        FOR v, e IN 1
          OUTBOUND u
          userTag
          LET ut = KEEP(e, 'story', 'relevance')
          LET us = MERGE(KEEP(u, 'username'), u.profile)
          LET tg = KEEP(v, 'tagname', 'description', 'created')
          SORT ut.relevance DESC, tg.tagname ASC
          RETURN MERGE(ut, { user: us }, { tag: tg })`;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();
    return output;
  }

  // TODO optionally filter out unverified users
  static async readUsersByTags(tagnames) {
    const query = `
      // find users by tags
      //
      // find the tags
      FOR t IN tags FILTER t.tagname IN @tagnames
        // find users linked to tags by userTag
        // (User)-[UserTag]->(Tag)
        FOR u,ut IN 1 ANY t
          INBOUND userTag
          // sort tags by relevance for the user
          SORT ut.relevance DESC
          // put similar users together
          COLLECT user=u INTO asdf KEEP t, ut
          // sort the users by the sum of relevances of found tags
          LET relevanceSum = SUM(asdf[*].ut.relevance)
          SORT relevanceSum DESC
          RETURN { user, relevanceSum, tags: asdf[*].t, userTags: asdf[*].ut }
    `;
    const params = { tagnames };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    return output;
  }

  /**
   * Find users related by common tags to @username
   * @param {string} username
   * @returns {Promise<Objec>}
   *
   */
  static async readUsersByMyTags(username) {
    const query = `
      FOR u IN users FILTER u.username==@username
        FOR v,e,p IN 2 OUTBOUND u
          ANY userTag
          LET relevanceWeight=SQRT(p.edges[0].relevance*p.edges[1].relevance)
          LET tag=p.vertices[1]
          LET utag=e
          LET finalUser=v
          SORT relevanceWeight DESC
          COLLECT user=finalUser INTO asdf KEEP relevanceWeight, tag, utag
          LET weightSum = SUM(asdf[*].relevanceWeight)
          SORT weightSum DESC
          RETURN { user, relevance: weightSum, tags: asdf[*].tag, userTags: asdf[*].utag }
    `;
    const params = { username };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    return output;
  }

  /**
   * Find users who have their location within rectangle given by two points (location1 and location2, each in format [latitude: number, longitude: number])
   *
   *
   */
  static async readUsersWithinRectangle(location1, location2) {
    const query = `
      FOR u IN WITHIN_RECTANGLE(users, @location1[0], @location1[1], @location2[0], @location2[1])
      RETURN KEEP(u, 'location', 'username', 'profile')
    `;
    const params = { location1, location2 };
    const cursor = await this.db.query(query, params);
    const output = await cursor.all();

    // flatten the users' profile
    _.each(output, (user) => {
      _.assign(user, _.pick(user.profile, ['givenName', 'familyName', 'description']));
      delete user.profile;
    });

    return output;
  }


    /**
   * Find [limit] new users (newlycreated and veryfied)
   * who has at least [similarTagsNumber] similar tags to mine
   * @param {int, int} limit, similatTagsNumber
   * @returns {Promise<Object>}
   */
  static async findNewUsersWithMyTags(myUsername, limit, commonTagsNumber) {
    const query = `
    FOR similarUser in (
    FOR u IN users
    FILTER u.username == @myUsername
    FILTER TO_BOOL(u.email) == true
    FOR v,e,p IN 2 OUTBOUND u
      ANY userTag
      COLLECT foundUser = v AGGREGATE numberOfCommonTags = COUNT(p[1]) INTO u2 
      RETURN {foundUser, numberOfCommonTags }
    )

    
    SORT similarUser.foundUser.created DESC
    FILTER TO_BOOL(similarUser.foundUser.email) == true
    FILTER similarUser.numberOfCommonTags >= @commonTagsNumber
    LIMIT @limit
    RETURN {username: similarUser.foundUser.username, commonTagsNumber: similarUser.numberOfCommonTags}
 
    `;
    const params = { myUsername, limit: parseInt(limit), similarTagsNumber: parseInt(commonTagsNumber) };
    const output = await (await this.db.query(query, params)).all();

    return output;
  }

  /**
   * counts users
   *
   * @param {Object} options
   * @param {boolean} options.verified
   */
  static async count(options) {
    const { verified } = options;
    const query = `
      FOR u IN users FILTER TO_BOOL(u.email) == @verified
        COLLECT WITH COUNT INTO length
        RETURN length`;
    const params = { verified };
    const count = await (await this.db.query(query, params)).next();

    return count;
  }

  /**
   * Find [limit] new users (newlycreated and veryfied)
   * @param {int} limit
   * @returns {Promise<Object>}
   */
  static async findNewUsers(limit) {
    const query = `
    FOR u IN users

    // filter veryfied users
    FILTER TO_BOOL(u.email) == true

    // return @limit number of sorted by creation date users  
    SORT u.created DESC
    LIMIT @limit
    RETURN {username: u.username}
    `;
    const params = { limit: parseInt(limit) };
    const output = await (await this.db.query(query, params)).all();

    return output;
  }

  /**
   * Find [limit] new users (newly created and veryfied)
   * who share at least[numberOfSharedTags] of my tags
   * @param {int, int} limit, number
   * @returns {Promise<Object>}
   */
   static async readNewUsersWithMyTags(me, limit, numberOfSharedTags) {
      
   }

  /**
   * delete unverified users who are created more than ttl ago
   *
   * @param {number} ttl - time to live for unverified users in seconds
   * @returns {number} - amount of deleted users
   */
  static async deleteUnverified(ttl) {
    const query = `
      FOR u IN users FILTER TO_BOOL(u.email) == false AND DATE_DIFF(u.created, @now, 'f') > @ttl
        REMOVE u IN users
        COLLECT WITH COUNT INTO length
        RETURN length
    `;
    const params = { ttl, now: Date.now() };
    const output = await (await this.db.query(query, params)).next();

    return output;
  }

  static async updatePassword(username, newPassword, disableCode) {
    const newHashedPassword = await account.hash(newPassword);

    const query = (disableCode)
      ?
      `FOR u IN users FILTER u.username == @username
        UPDATE u WITH { password: @password, account: MERGE(u.account, { password: null }) } IN users OPTIONS { keepNull: false }
        RETURN NEW`
      :
      `FOR u IN users FILTER u.username == @username
      UPDATE u WITH { password: @password } IN users
      RETURN NEW`;

    const params = { username, password: newHashedPassword };

    await this.db.query(query, params);

  }

}

module.exports = User;
