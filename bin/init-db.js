#!/usr/bin/env node

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const path = require('path'),
      arangojs = require('arangojs'),
      prompt = require('prompt'),
      config = require(path.resolve('./config')),
      collections = require(path.resolve('./collections')),
      init = require(path.resolve('./initDatabase'));

const schema = { properties: {
  username: { required: true },
  password: { required: true, hidden: true }
} };

prompt.start();
prompt.get(schema, async function (err, result) {
  const rootUser = result.username;
  const rootPasswd = encodeURIComponent(result.password);

  const db = arangojs({ url: `http://${rootUser}:${rootPasswd}@${config.database.host}:${config.database.port}` });

  const { database: dbName, password: dbPasswd, username: dbUser } = config.database;

  try {
    await init({ db, dbName, dbPasswd, dbUser, collections });
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
  }
});
