'use strict';

var co = require('co');
module.exports = function (parameters) {
  let db = parameters.db;
  let dbUser = parameters.dbUser;
  let dbPasswd = parameters.dbPasswd;
  let dbName = parameters.dbName;
  let collections = parameters.collections;

  return co(function *() {
    //dropping database if exist
    try {
      yield db.dropDatabase(dbName);
    }
    catch (err) {
      console.log('creating new database');
    }
    //(re)creating the database
    yield db.createDatabase(dbName, [{username: dbUser, passwd: dbPasswd}]);
    
    db.useDatabase(dbName);

    for(let cnm in collections) {
      //creating the collection
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
      yield col.create();
      //creating indexes
      //
      //unique hash index
      collections[cnm].indexes = collections[cnm].indexes || [];

      for(let index of collections[cnm].indexes){
        yield col.createIndex(index);
      }
    }
    

    // ************* graph ************* //
    let graph = db.graph('ditup_graph');
    
    //populating graph properties from collections
    let graphProperties = (function () {

      //the object to return
      let properties = {
        edgeDefinitions: [],
        orphanCollections: []
      };
      
      //keeping track of documents which are used as vertexes
      let nonOrphans = [];

      for(let cnm in collections) {
        let collection = collections[cnm];

        if(collection.type === 'edge') {
          //adding the edge to the edgeDefinitions
          properties.edgeDefinitions.push({
            collection: cnm,
            from: collection.from,
            to: collection.to
          });
          
          //keeping track of documents used as vertexes
          for(let vertex of collection.from){
            if(nonOrphans.indexOf(vertex) === -1) nonOrphans.push(vertex);
          }
          for(let vertex of collection.to){
            if(nonOrphans.indexOf(vertex) === -1) nonOrphans.push(vertex);
          }
          //END
        }
      }
      
      //populating the orphanCollections (the documents not yet used as vertexes)
      for(let cnm in collections) {
        let collection = collections[cnm];

        //check whether a document is an orphan
        if(collection.type === 'document' && nonOrphans.indexOf(cnm) === -1) {
          properties.orphanCollections.push(cnm);
        }
      }

      return properties;
    })();

    let graphInfo = yield graph.create(graphProperties);
    console.log(graphInfo);
    // ************ END graph *************** //
  });
};
