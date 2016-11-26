'use strict';

var _ = require('lodash'),
    path = require('path');

var Model = require(path.resolve('./models/model')),
    account = require('./account'),
    schema = require('./schema');

class User extends Model {

  static async create(user) {
    let emailVerifyCode = await account.generateHexCode(32);
    user.emailVerifyCode = emailVerifyCode;
    user = await schema(user);
    await this.db.query('INSERT @user IN users', { user: user });
    return { emailVerifyCode: emailVerifyCode };
  }

  static async read(username) {
    let query = 'FOR u IN users FILTER u.username == @username RETURN u';
    let params = { username: username };
    let cursor = await this.db.query(query, params);
    let output = await cursor.all();
    return output[0];
  }

  static async update(username, newData) {
    let profile = _.pick(newData, ['givenName', 'familyName', 'description']);
    let query = `FOR u IN users FILTER u.username == @username
      UPDATE u WITH { profile: @profile } IN users
      RETURN NEW`;
    let params = { username: username, profile: profile };
    let cursor = await this.db.query(query, params);
    let output = await cursor.all();
    return output[0];
  }

  static async exists(username) {
    let query = `
      FOR u IN users FILTER u.username == @username
        COLLECT WITH COUNT INTO length
        RETURN length`;
    let params = { username: username };
    let cursor = await this.db.query(query, params);
    let count = await cursor.next();

    switch (count) {
      case 0:
        return false;
        break;
      case 1:
        return true;
        break;
      default:
        throw new Error('bad output');
    }
  }

  // authenticate user provided username password combination
  static async authenticate(username, password) {
    // get information from database
    let query = `
      FOR u IN users FILTER u.username == @username
        RETURN {
          username: u.username,
          password: u.password,
          email: u.email,
          profile: u.profile
        }`;
    let params = { username: username };
    let cursor = await this.db.query(query, params);
    let output = await cursor.all();

    // default not authenticated values
    let credentialsMatch = false,
        isVerified = false,
        profile;

    // change default values when authenticated
    switch (output.length) {
      case 0:
        break;
      case 1:
        credentialsMatch = await account.compare(password, output[0].password);
        isVerified = Boolean(output[0].email);
        profile = _.pick(output[0].profile, ['givenName', 'familyName']);
        break;
      default:
        throw new Error('Database Error');
    }

    if (credentialsMatch) profile.username = username;

    let user = {
      authenticated: credentialsMatch,
      verified: Boolean(isVerified && credentialsMatch)
    };

    _.assign(user, profile);

    return user;
  }

  static async emailExists(email) {
    let query = `
      FOR u IN users FILTER u.email == @email
        COLLECT WITH COUNT INTO length
        RETURN length`;
    let params = { email: email };
    let count = await (await this.db.query(query, params)).next();

    switch (count) {
      case 0:
        return false;
        break;
      case 1:
        return true;
        break;
      default:
        throw new Error('bad output');
    }
  }

  static async verifyEmail(username, code) {
    // read the data
    let query = `
      FOR u IN users FILTER u.username == @username
        RETURN {
          email: u.account.email.temporary,
          code: u.account.email.code,
          codeExpire: u.account.email.codeExpire
        }
    `;
    let params = { username: username }
    let output = await (await this.db.query(query, params)).all();
    
    if(output.length === 0) throw new Error('User Not Found');
    if(output.length > 1) throw new Error('Database Corruption');
    let info = output[0];
    let isAlreadyVerified = !(info.email && info.code && info.codeExpire);
    if (isAlreadyVerified) throw new Error('User is already verified');

    // check the codes, time limit
    let isCodeExpired = Date.now() > info.codeExpire;
    if (isCodeExpired) throw new Error('Code Is Expired');

    let codeMatches = await account.compare(code, info.code);

    if (codeMatches !== true) throw new Error('Code Is Not Correct');
    // if correct, put emailTemporary to email and erase all the rest
    await this.finalVerifyEmail(username);
  }

  static async finalVerifyEmail(username) {
    let query = `
      FOR u IN users FILTER u.username == @username
        UPDATE {
          _key: u._key,
          email: u.account.email.temporary,
          account: MERGE(u.account, { email: null })
        }
        IN users
    `;
    let params = { username: username };
    await this.db.query(query, params);
  }

  static async readTags(username) {
    let query = `
      FOR u IN users FILTER u.username == @username
        FOR v, e IN 1
          OUTBOUND u
          userTag
          LET ut = KEEP(e, 'story', 'created')
          LET us = MERGE(KEEP(u, 'username'), u.profile)
          LET tg = KEEP(v, 'tagname', 'description', 'created')
          RETURN MERGE(ut, { user: us }, { tag: tg })`;
    let params = { username: username };
    let cursor = await this.db.query(query, params);
    let output = await cursor.all();
    return output;
  }
}

module.exports = User;
