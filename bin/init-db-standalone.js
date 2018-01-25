#!/usr/bin/env node

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const path = require('path'),
      arangojs = require('arangojs'),
      config = require(path.resolve('./config')),
      collections = require(path.resolve('./collections')),
      init = require(path.resolve('./init-database')),
      initConfig = require('./init-db-standalone-config');

const rootUser = initConfig.username;
const rootPasswd = encodeURIComponent(initConfig.password);

const db = arangojs({ url: `http://${rootUser}:${rootPasswd}@${config.database.host}:${config.database.port}` });

const { database: dbName, password: dbPasswd, username: dbUser } = config.database;

init({ db, dbName, dbPasswd, dbUser, collections })
  .catch(err => console.log(err)); // eslint-disable-line no-console
