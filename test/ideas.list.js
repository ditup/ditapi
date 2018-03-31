'use strict';

const should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database');

describe('read lists of ideas', () => {

  let agent,
      dbData;

  // default supertest agent (not logged in)
  beforeEach(() => {
    agent = agentFactory();
  });

  // clear database after each test
  afterEach(async () => {
    await dbHandle.clear();
  });

  describe('GET /ideas?filter[withMyTags]', () => {

    let tag1,
        idea0,
        user0;

    // create and save testing data
    beforeEach(async () => {
      const data = {
        users: 3,
        verifiedUsers: [0, 1, 2],
        tags: 6,
        ideas: Array(7).fill([]),
        userTag: [
          [0,0,'',5],[0,1,'',4],[0,2,'',3],[0,4,'',1],
          [1,1,'',4],[1,3,'',2],
          [2,5,'',2]
        ],
        ideaTags: [
          [0,0],[0,1],[0,2],
          [1,1],[1,2],
          [2,1],[2,2],[2,4],
          [4,0],[4,1],[4,2],[4,3],[4,4],
          [5,2],[5,3],
          [6,3]
        ]
      };

      dbData = await dbHandle.fill(data);

      [user0] = dbData.users;
      [idea0] = dbData.ideas;
      tag1 = dbData.tags[1];
    });

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(user0);
      });

      context('valid data', () => {

        it('200 and return array of matched ideas', async () => {

          // request
          const response = await agent
            .get('/ideas?filter[withMyTags]')
            .expect(200);

          // we should find 5 ideas...
          should(response.body).have.property('data').Array().length(5);

          // ...sorted by sum of my tag relevances
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([4, 0, 2, 1, 5].map(no => `idea title ${no}`));

          // ideaTags should be present as relationships
          should(response.body.data[1]).have.propertyByPath('relationships', 'ideaTags', 'data').Array().length(3);
          should(response.body.data[1].relationships.ideaTags.data[1]).deepEqual({
            type: 'idea-tags',
            id: `${idea0.id}--${tag1.tagname}`
          });

          // and idea-tags should be included, too
          const includedIdeaTags = response.body.included.filter(included => included.type === 'idea-tags');
          should(includedIdeaTags).Array().length(13);
        });

        it('[pagination] offset and limit the results', async () => {
          const response = await agent
            .get('/ideas?filter[withMyTags]&page[offset]=1&page[limit]=3')
            .expect(200);

          // we should find 3 ideas
          should(response.body).have.property('data').Array().length(3);

          // sorted by sum of my tag relevances and started from the 2nd one
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([0, 2, 1].map(no => `idea title ${no}`));
        });
      });

      context('invalid data', () => {

        it('[invalid query.filter.withMyTags] 400', async () => {
          await agent
            .get('/ideas?filter[withMyTags]=1')
            .expect(400);
        });

        it('[invalid pagination] 400', async () => {
          await agent
            .get('/ideas?filter[withMyTags]&page[offset]=1&page[limit]=21')
            .expect(400);
        });

        it('[unexpected query params] 400', async () => {
          await agent
            .get('/ideas?filter[withMyTags]&filter[Foo]=bar')
            .expect(400);
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent
          .get('/ideas?filter[withMyTags]')
          .expect(403);
      });
    });
  });

  describe('GET /ideas?filter[withTags]=tag0,tag1,tag2', () => {

    let tag0,
        tag1,
        tag3,
        tag4,
        idea0,
        user0;

    // create and save testing data
    beforeEach(async () => {
      const data = {
        users: 3,
        verifiedUsers: [0, 1, 2],
        tags: 6,
        ideas: Array(7).fill([]),
        ideaTags: [
          [0,0],[0,1],[0,2],
          [1,1],[1,2],
          [2,1],[2,2],[2,4],
          [4,0],[4,1],[4,2],[4,3],[4,4],
          [5,2],[5,3],
          [6,3]
        ]
      };

      dbData = await dbHandle.fill(data);

      [user0] = dbData.users;
      [idea0] = dbData.ideas;
      [tag0, tag1,, tag3, tag4] = dbData.tags;
    });

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(user0);
      });

      context('valid data', () => {

        it('200 and return array of matched ideas', async () => {

          // request
          const response = await agent
            .get(`/ideas?filter[withTags]=${tag0.tagname},${tag1.tagname},${tag3.tagname},${tag4.tagname}`)
            .expect(200);

          // we should find 6 ideas...
          should(response.body).have.property('data').Array().length(6);

          // ...sorted by sum of my tag relevances
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([4, 0, 2, 1, 5, 6].map(no => `idea title ${no}`));

          // ideaTags should be present as relationships
          should(response.body.data[1]).have.propertyByPath('relationships', 'ideaTags', 'data').Array().length(2);
          should(response.body.data[1].relationships.ideaTags.data[1]).deepEqual({
            type: 'idea-tags',
            id: `${idea0.id}--${tag1.tagname}`
          });

          // and idea-tags should be included, too
          const includedIdeaTags = response.body.included.filter(included => included.type === 'idea-tags');
          should(includedIdeaTags).Array().length(11);
        });

        it('[pagination] offset and limit the results', async () => {
          const response = await agent
            .get(`/ideas?filter[withTags]=${tag0.tagname},${tag1.tagname},${tag3.tagname},${tag4.tagname}&page[offset]=1&page[limit]=3`)
            .expect(200);

          // we should find 3 ideas
          should(response.body).have.property('data').Array().length(3);

          // sorted by sum of my tag relevances and started from the 2nd one
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([0, 2, 1].map(no => `idea title ${no}`));
        });
      });

      context('invalid data', () => {

        it('[invalid tagnames in a list] error 400', async () => {
          await agent
            .get('/ideas?filter[withTags]=invalid--tagname,other-invalid*tagname')
            .expect(400);
        });

        it('[too many tags provided] error 400', async () => {
          await agent
            .get('/ideas?filter[withTags]=t0,t1,t2,t3,t4,t5,t6,t7,t8,t9,t10')
            .expect(400);
        });

        it('[no tags provided] error 400', async () => {
          await agent
            .get('/ideas?filter[withTags]=')
            .expect(400);
        });

        it('[invalid pagination] 400', async () => {
          await agent
            .get('/ideas?filter[withTags]=tag1,tag2,tag3&page[offset]=1&page[limit]=21')
            .expect(400);
        });

        it('[unexpected query params] 400', async () => {
          await agent
            .get('/ideas?filter[withTags]=tag&filter[Foo]=bar')
            .expect(400);
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent
          .get('/ideas?filter[withTags]=tag0')
          .expect(403);
      });
    });
  });

  describe('GET /ideas?sort=-created (new ideas)', () => {

    let loggedUser;

    // create and save testing data
    beforeEach(async () => {
      const data = {
        users: 3,
        verifiedUsers: [0, 1, 2],
        tags: 6,
        ideas: Array(11).fill([])
      };

      dbData = await dbHandle.fill(data);

      loggedUser = dbData.users[0];
    });

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid', () => {
        it('200 and array of new ideas', async () => {

          // request
          const response = await agent
            .get('/ideas?sort=-created')
            .expect(200);

          // we should find 5 ideas...
          should(response.body).have.property('data').Array().length(5);

          // ...sorted from newest to oldest
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([10, 9, 8, 7, 6].map(no => `idea title ${no}`));
        });

        it('[pagination] 200 and array of new ideas, offseted and limited', async () => {

          // request
          const response = await agent
            .get('/ideas?sort=-created&page[offset]=3&page[limit]=4')
            .expect(200);

          // we should find 4 ideas...
          should(response.body).have.property('data').Array().length(4);

          // ...sorted from newest to oldest
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([7, 6, 5, 4].map(no => `idea title ${no}`));
        });
      });

      context('invalid', () => {
        it('[invalid pagination] 400', async () => {
          await agent
            .get('/ideas?sort=-created&page[offset]=3&page[limit]=21')
            .expect(400);
        });

        it('[unexpected query params] 400', async () => {
          await agent
            .get('/ideas?sort=-created&foo=bar')
            .expect(400);
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent
          .get('/ideas?sort=-created')
          .expect(403);
      });
    });
  });

  describe('GET /ideas?filter[random]', () => {

    let loggedUser;

    // create and save testing data
    beforeEach(async () => {
      const data = {
        users: 3,
        verifiedUsers: [0, 1, 2],
        ideas: Array(11).fill([])
      };

      dbData = await dbHandle.fill(data);

      loggedUser = dbData.users[0];
    });

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(loggedUser);
      });

      context('valid', () => {
        it('200 and array of random ideas', async () => {

          // request
          const response = await agent
            .get('/ideas?filter[random]')
            .expect(200);

          // we should find 1 idea by default
          should(response.body).have.property('data').Array().length(1);
        });

        it('[pagination] 200 and array of random ideas, limited', async () => {

          // request
          const response = await agent
            .get('/ideas?filter[random]&page[offset]=0&page[limit]=4')
            .expect(200);

          // we should find 4 ideas...
          should(response.body).have.property('data').Array().length(4);
        });
      });

      context('invalid', () => {
        it('[invalid pagination] 400', async () => {
          await agent
            .get('/ideas?filter[random]&page[offset]=3&page[limit]=21')
            .expect(400);
        });

        it('[unexpected query params] 400', async () => {
          await agent
            .get('/ideas?filter[random]&foo=bar')
            .expect(400);
        });

        it('[random with value] 400', async () => {
          await agent
            .get('/ideas?filter[random]=bar')
            .expect(400);
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent
          .get('/ideas?filter[random]')
          .expect(403);
      });
    });
  });

  describe('GET /ideas?filter[creators]=user0,user1,user2', () => {
    let user0,
        user2,
        user3,
        user4;
    // create and save testing data
    beforeEach(async () => {
      const data = {
        users: 6,
        tags: 6,
        verifiedUsers: [0, 1, 2, 3, 4],
        ideas: [[{}, 0], [{}, 0],[{}, 1],[{}, 2],[{}, 2],[{}, 2],[{}, 3]]
      };

      dbData = await dbHandle.fill(data);

      [user0, , user2, user3, user4, ] = dbData.users;
    });

    context('logged in', () => {

      beforeEach(() => {
        agent = agentFactory.logged(user0);
      });

      context('valid data', () => {

        it('[one creator] 200 and return array of matched ideas', async () => {

          // request
          const response = await agent
            .get(`/ideas?filter[creators]=${user2.username}`)
            .expect(200);

          // we should find 2 ideas...
          should(response.body).have.property('data').Array().length(3);

          // sorted by creation date desc
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([5, 4, 3].map(no => `idea title ${no}`));

        });


        it('[two creators] 200 and return array of matched ideas', async () => {

          // request
          const response = await agent
            .get(`/ideas?filter[creators]=${user2.username},${user3.username}`)
            .expect(200);

          // we should find 5 ideas...
          should(response.body).have.property('data').Array().length(4);

          // sorted by creation date desc
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([6, 5, 4, 3].map(no => `idea title ${no}`));
        });

        it('[creator without ideas] 200 and return array of matched ideas', async () => {

          // request
          const response = await agent
            .get(`/ideas?filter[creators]=${user4.username}`)
            .expect(200);

          // we should find 0 ideas...
          should(response.body).have.property('data').Array().length(0);

        });

        it('[pagination] offset and limit the results', async () => {
          const response = await agent
            .get(`/ideas?filter[creators]=${user2.username},${user3.username}&page[offset]=1&page[limit]=3`)
            .expect(200);

          // we should find 3 ideas
          should(response.body).have.property('data').Array().length(3);

          // sorted by creation date desc
          should(response.body.data.map(idea => idea.attributes.title))
            .eql([5, 4, 3].map(no => `idea title ${no}`));
        });

        it('[nonexistent creator] 200 and return array of matched ideas', async () => {

          // request
          const response = await agent
            .get('/ideas?filter[creators]=nonexistentcreator')
            .expect(200);

          // we should find 0 ideas...
          should(response.body).have.property('data').Array().length(0);

        });
      });

      context('invalid data', () => {

        it('[invalid query.filter.creators] 400', async () => {
          await agent
            .get('/ideas?filter[creators]=1')
            .expect(400);
        });

        it('[invalid pagination] 400', async () => {
          await agent
            .get(`/ideas?filter[creators]=${user2.username},${user3.username}&page[offset]=1&page[limit]=21`)
            .expect(400);
        });

        it('[unexpected query params] 400', async () => {
          await agent
            .get(`/ideas?filter[creators]=${user2.username},${user3.username}&additional[param]=3&page[offset]=1&page[limit]=3`)
            .expect(400);
        });
      });
    });

    context('not logged in', () => {
      it('403', async () => {
        await agent
          .get(`/ideas?filter[creators]=${user2.username}`)
          .expect(403);
      });
    });
  });
});
