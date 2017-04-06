'use strict';

const arangojs = require('arangojs');

class Model {
  static get db() {
    return this.database;
  }

  static connect({ username, password, host, port, database, protocol }) {
    protocol = protocol || 'http';
    this.database = arangojs({
      url: `${protocol}://${username}:${encodeURIComponent(password)}@${host}:${port}`,
      databaseName: database
    });
  }
}

module.exports = exports = Model;
