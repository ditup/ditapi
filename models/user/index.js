'use strict';

var co = require('co'),
    path = require('path');

var Model = require(path.resolve('./models/model')),
    account = require('./account'),
    schema = require('./schema');

class User extends Model {

  static create(user) {
    return co.call(this, function * () {
      let emailVerifyCode = yield account.generateHexCode(32);
      user.emailVerifyCode = emailVerifyCode;
      user = yield schema(user);
      yield this.db.query('INSERT @user IN users', { user: user });
      return { emailVerifyCode: emailVerifyCode };
    });
  }

  static read(username) {
    return co.call(this, function * () {
      let query = 'FOR u IN users FILTER u.username == @username RETURN u';
      let params = { username: username };
      let cursor = yield this.db.query(query, params);
      let output = yield cursor.all();
      return output[0];
    });
  }

  static exists(username) {
    return co.call(this, function * () {
      let query = `
        FOR u IN users FILTER u.username == @username
          COLLECT WITH COUNT INTO length
          RETURN length`;
      let params = { username: username };
      let cursor = yield this.db.query(query, params);
      let count = yield cursor.next();

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
    });
  }

  static emailExists(email) {
    return co.call(this, function * () {
      let query = `
        FOR u IN users FILTER u.email == @email
          COLLECT WITH COUNT INTO length
          RETURN length`;
      let params = { email: email };
      let count = yield (yield this.db.query(query, params)).next();

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
    });
  }

  static verifyEmail(username, code) {
    return co.call(this, function * () {
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
      let output = yield (yield this.db.query(query, params)).all();
      
      if(output.length === 0) throw new Error('User Not Found');
      if(output.length > 1) throw new Error('Database Corruption');
      let info = output[0];
      let isAlreadyVerified = !(info.email && info.code && info.codeExpire);
      if (isAlreadyVerified) throw new Error('User is already verified');

      // check the codes, time limit
      let isCodeExpired = Date.now() > info.codeExpire;
      if (isCodeExpired) throw new Error('Code Is Expired');

      console.log(code, info.code);
      
      let codeMatches = yield account.compare(code, info.code);

      if (codeMatches !== true) throw new Error('Code Is Not Correct');
      // if correct, put emailTemporary to email and erase all the rest
      yield this.finalVerifyEmail(username);
    });
  }

  static finalVerifyEmail(username) {
    return co.call(this, function * () {
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
      yield this.db.query(query, params);
    });
  }
}

module.exports = User;
