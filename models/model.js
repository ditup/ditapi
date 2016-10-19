'use strict';

let arangojs = require('arangojs');

class Model {
  static get db() {
    return this.database;
  }

  static connect({ username: username, password: password, host: host, port: port, database: database, protocol: protocol }) {
    protocol = protocol || 'http';
    this.database = arangojs({
      url: `${protocol}://${username}:${encodeURIComponent(password)}@${host}:${port}`,
      databaseName: database
    });
  }
}

module.exports = exports = Model;
