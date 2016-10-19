'use strict';

var co = require('co');
let collectionDefinitions = require('../services/data/collections');

module.exports = function (db) {
  var data = require('../services/independentData')({db: db});
  var generateUrl = require('../routes/discussion/functions').generateUrl;
  
  var dependencies = (function () {
    var validate = require('../services/validation');
    var database = require('../services/independentData')({db: db});
    var accountService = require('../services/account');
    var accountConfig = require('../config/user/account.json');

    var independentAccount = require('../modules/independentAccount');

    var dependencies = {
      validate: validate,
      database: database,
      accountService: accountService,
      accountConfig: accountConfig,
      generateUrl: generateUrl
    };

    return dependencies;
  })();

  data.createUser = require('../modules/independentAccount')(dependencies).createUser;

  /**
   * 
   *
   */
  function populate(dbData) {
    //put dbData to database
    //create users

    //non-present collections have default empty array
    (function emptyData() {
      //iterating through collection names
      for(let colName in collectionDefinitions) {
        dbData[colName] = dbData[colName] || [];
      }

      dbData.userProfiles = dbData.userProfiles || [];
    })();

    function populateNotifications(notifications, users) {
      return co(function *() {
        for(let nt of notifications) {
          let output = yield data.notifications.create({to: users[nt.to].username, text: nt.text, url: nt.url});
          nt.id = output.id;
        }
        return;
      });
    };
    
    function populateMessages(messages, users) {
      return co(function *() {
        for(let msg of messages) {
          yield data.messages.create({from: users[msg.from].username, to: users[msg.to].username, text: msg.text});
        }
        return;
      });
    };

    function populateUsers(users) {
      return co(function * () {
        for(let user of users) {
          var userData = {
            username: user.username,
            password: user.password,
            password2: user.password,
            email: user.email
          };
          yield data.createUser(userData);

          //email is by default verified, but can be not verified if specified verified: false
          if(user.verified !== false) {
            yield data.user.updateEmailVerified({username: userData.username}, {verifyDate: Date.now(), verified: true});
          }
        }
      });
    }

    function populateUserProfiles(users, profiles) {
      return co(function * () {
        for(let profile of profiles) {
          yield data.user.updateProfile(users[profile.user], profile);
          users[profile.user].profile = profile;
        }
      });
    }

    function populateTags(tags, users) {
      return co(function * () {
        for(let tag of tags) {
          let creator = typeof(tag.creator) === 'number' ? users[tag.creator].username : tag.creator;
          tag.creator = creator;
          tag.tagname = tag.name || tag.tagname;
          yield data.tag.create({
            name: tag.tagname,
            description: tag.description,
            meta: {
              created: Date.now(),
              creator: creator
            }
          });
        }
      });
    }

    function populateCollections(collections, users, collectionName) {
      return co(function * () {
        for(let collection of collections) {
          collection.creator = typeof(collection.creator) === 'number' ? users[collection.creator].username : collection.creator;

          let createdCollection = yield data[collectionName].create(collection);

          collection.id = createdCollection.id;
          collection.url = generateUrl(collection.name);
          collection.tags = collection.tags || [];
        }
      });
    }

    function populateUserTag(userTag, users, tags) {
      var utPromises = [];
      //resetting the tags in data object to empty
      for(let u of users){
        u.tags = [];
      }
      for(let _ut of userTag) {
        let user = users[_ut.user];
        let tag = typeof(_ut.tag) === 'number' ? tags[_ut.tag] : {name: _ut.tag};
        let utp = data.user.addTag(user, tag);
        utPromises.push(utp);
      }
      return Promise.all(utPromises)
        .then(function () {
          for(let _ut of userTag) {
            let tagsArray = users[_ut.user].tags;
            let tag = typeof(_ut.tag) === 'number' ? tags[_ut.tag].name : _ut.tag;
            tagsArray.push(tag);
          }
          return;
        });
    }

    function populateCollectionTag(collectionTag, collections, tags, users, collectionName) {
      return co(function * () {
        for(let c of collections){
          c.tags = [];
        }

        for(let ct of collectionTag) {
          let creator = users[ct.creator].username;
          let collectionId = collections[ct.collection].id;
          //let tag = typeof(ct.tag) === 'number' ? tags[ct.tag].tagname: ct.tag;
          let tagname = tags[ct.tag].tagname;
          yield data[collectionName].addTag(collectionId, tagname, creator);

          let tagsArray = collections[ct.collection].tags;
          tagsArray.push(tagname);
        }
      });
    }

    function populateCollectionCommentAuthor(collectionCommentAuthor, collections, users, collectionName) {
      var challengeCommentAuthor = collectionCommentAuthor;
      var challenges = collections;
      var ccaPromises = [];
      for(let c of collections) {
        c.comments = [];
      }
      for(let _cca of challengeCommentAuthor) {
        let author = typeof(_cca.author) === 'number' ? users[_cca.author].username : _cca.author;
        let challenge = challenges[_cca[collectionName]];
        let ccap = data[collectionName].addComment(challenge.id, {text: _cca.text}, author);

        //update the data object with challenge comments
        challenge.comments = challenge.comments || [];
        challenge.comments.push({text: _cca.text, author: author});


        ccaPromises.push(ccap);
      }
      return Promise.all(ccaPromises)
        .then(function (ccaps) {
          for(let i=0, len=ccaps.length; i<len; ++i) {
            let cca = collectionCommentAuthor[i];
            cca.author = typeof(cca.author) === 'number' ? users[cca.author].username : cca.author;
            //cca[collectionName] = {id: collections[cca[collectionName]].id};
            cca.id = ccaps[i].id;
            let challenge = challenges[cca[collectionName]];
            challenge.comments[i].id = ccaps[i].id;
          }
          return;
        });
    
    }

    function populateUserFollowUser(userFollowUser, users) {
      return co(function * () {
        for(let ufu of userFollowUser) {
          yield data.user.follow(users[ufu.follower].username, users[ufu.followed].username);
        }
      });
    }

    function populateUserFollowCollection(userFollowCollection, users, collections, collectionName) {
      var ufcPromises = [];

      for(let c of collections) {
        c.followers = [];
        c.hiders = [];
      }
      for(let ufc of userFollowCollection) {
        let username = users[ufc.user].username;
        let collection = collections[ufc.collection];
        let hide = ufc.hide === true ? true : false;

        //creating a database.collection.follow() promise and adding it to the array for further Promise.all()
        let ufcp = data[collectionName].follow(collection.id, username, hide);
        ufcPromises.push(ufcp);

        //update the data object's collection Array of followers or hiders with the username
        if(hide === true) {
          collection.hiders.push(username);
        }
        else{
          collection.followers.push(username);
        }
      }

      return Promise.all(ufcPromises)
        .then(function (ufcps) {
          return;
        });
    }

    function populateProjectMember(projectMember, collections, users) {
      var pmPromises = [];

      for(let u of users) {
        u.projects = {
          joining: [],
          invited: [],
          member: []
        };
      }

      for(let p of collections) {
        p.members = {
          joining: [],
          invited: [],
          member: []
        };
      }
      for(let pm of projectMember) {
        let user = users[pm.user];
        let username = users[pm.user].username;
        let collection = collections[pm.collection];
        let status = pm.status;
        let request = status === 'joining' ? (pm.request || '') : undefined;
        let invitation = status === 'invited' ? (pm.invitation || '') : undefined;

        //creating a database.collection.follow() promise and adding it to the array for further Promise.all()
        let pmp = data.project.addMember(collection.id, username, status, {request: request, invitation: invitation});
        pmPromises.push(pmp);

        //update the data object's collection Array of followers or hiders with the username

        collection.members[status].push({username: user.username, password: user.password});
        user.projects[status].push({id: collection.id});
      }

      return Promise.all(pmPromises)
        .then(function (pmps) {
          return;
        });
    }
    
    /////************** BEGIN building promise chain to return
    let collections = ['idea', 'challenge', 'project', 'discussion'];

    //promise to return
    
    return co(function *() {
      yield populateUsers(dbData.users);
      yield populateUserProfiles(dbData.users, dbData.userProfiles);
      yield populateUserFollowUser(dbData.userFollowUser, dbData.users);
      yield populateTags(dbData.tags, dbData.users);
      yield populateUserTag(dbData.userTag, dbData.users, dbData.tags);
      //**************** populating collections
      for(let col of collections) {
        let Col = capitalize(col);

        yield populateCollections(dbData[col + 's'], dbData.users, col);
        yield Promise.all([
          populateCollectionTag(dbData[col+'Tag'], dbData[col+'s'], dbData.tags, dbData.users, col),
          populateCollectionCommentAuthor(dbData[col+'CommentAuthor'], dbData[col+'s'], dbData.users, col),
          populateUserFollowCollection(dbData['userFollow'+Col], dbData.users, dbData[col+'s'], col)
        ]);
      }
      yield populateProjectMember(dbData.projectMember, dbData.projects, dbData.users);
      yield populateMessages(dbData.messages || [], dbData.users);
      yield populateNotifications(dbData.notifications || [], dbData.users);

      return Promise.resolve();

    })
    .catch(function (err) {
      return Promise.reject(err);
    });


    //**************** populating collections

    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }
  
  /**
   * it promises to clear all the data from database
   *
   *
   */
  function clear() {
    return db.truncate()
      .then(function () {
        return;
      });
  }

  function init(collections, dbName) {
  }

  return {
    init: init,
    populate: populate,
    clear: clear
  };
};
