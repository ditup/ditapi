'use strict';

module.exports = async function ({ db, dbUser, dbPasswd, dbName, collections }) {
  // dropping database if exist
  try {
    await db.dropDatabase(dbName);
  }
  catch (err) {
    console.log('creating new database'); // eslint-disable-line no-console
  }

  if (dbUser === 'root') throw new Error('Don\'t use root. Change your config.');

  let cursor = await db.query('FOR u IN _users FILTER u.user == @username REMOVE u IN _users', { username: dbUser });

  if (cursor.extra.stats.writesExecuted === 1) {
    console.log(`recreating user ${dbUser}`); // eslint-disable-line no-console
  } else {
    console.log(`creating a new user ${dbUser}`); // eslint-disable-line no-console
  }

  // (re)creating the database
  await db.createDatabase(dbName, [{username: dbUser, passwd: dbPasswd}]);

  db.useDatabase(dbName);

  for(let cnm in collections) {
    // creating the collection
    let col;
    if(collections[cnm].type === 'document') {
      col = db.collection(cnm);
    }
    else if(collections[cnm].type === 'edge') {
      col = db.edgeCollection(cnm);
    }
    else{
      throw new Error('not document nor edge');
    }
    await col.create();
    // creating indexes
    //
    // unique hash index
    collections[cnm].indexes = collections[cnm].indexes || [];

    for(let index of collections[cnm].indexes){
      await col.createIndex(index);
    }
  }


  // ************* graph ************* //
  let graph = db.graph('ditup_graph');

  // populating graph properties from collections
  let graphProperties = (function () {

    // the object to return
    let properties = {
      edgeDefinitions: [],
      orphanCollections: []
    };

    // keeping track of documents which are used as vertexes
    let nonOrphans = [];

    for(let cnm in collections) {
      let collection = collections[cnm];

      if(collection.type === 'edge') {
        // adding the edge to the edgeDefinitions
        properties.edgeDefinitions.push({
          collection: cnm,
          from: collection.from,
          to: collection.to
        });

        // keeping track of documents used as vertexes
        for(let vertex of collection.from){
          if(nonOrphans.indexOf(vertex) === -1) nonOrphans.push(vertex);
        }
        for(let vertex of collection.to){
          if(nonOrphans.indexOf(vertex) === -1) nonOrphans.push(vertex);
        }
        // END
      }
    }

    // populating the orphanCollections (the documents not yet used as vertexes)
    for(let cnm in collections) {
      let collection = collections[cnm];

      // check whether a document is an orphan
      if(collection.type === 'document' && nonOrphans.indexOf(cnm) === -1) {
        properties.orphanCollections.push(cnm);
      }
    }

    return properties;
  })();

  let graphInfo = await graph.create(graphProperties);
  console.log(graphInfo); // eslint-disable-line no-console
  // ************ END graph *************** //
};
