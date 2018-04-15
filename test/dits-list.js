'use strict';

const path = require('path'),
      should = require('should'),
      sinon = require('sinon');

const  models = require(path.resolve('./models'));

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database');

testDitsList('idea');
testDitsList('challenge');

function testDitsList(dit){
  describe(`read lists of ${dit}s`, () => {

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

    describe(`GET /${dit}s?filter[withMyTags]`, () => {

      let tag1,
          dit0,
          user0;

      // create and save testing data
      beforeEach(async () => {
        const data = {
          users: 3,
          verifiedUsers: [0, 1, 2],
          tags: 6,
          [`${dit}s`]: Array(7).fill([]),
          userTag: [
            [0,0,'',5],[0,1,'',4],[0,2,'',3],[0,4,'',1],
            [1,1,'',4],[1,3,'',2],
            [2,5,'',2]
          ],
          [`${dit}Tags`]: [
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
        [dit0] = dbData[`${dit}s`];
        tag1 = dbData.tags[1];
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid data', () => {

          it(`200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[withMyTags]`)
              .expect(200);

            // we should find 5 dits...
            should(response.body).have.property('data').Array().length(5);

            // ...sorted by sum of my tag relevances
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([4, 0, 2, 1, 5].map(no => `${dit} title ${no}`));

            // ditTags should be present as relationships
            should(response.body.data[1]).have.propertyByPath('relationships', `${dit}Tags`, 'data').Array().length(3);
            should(response.body.data[1].relationships[`${dit}Tags`].data[1]).deepEqual({
              type: `${dit}-tags`,
              id: `${dit0.id}--${tag1.tagname}`
            });

            // and dit-tags should be included, too
            const includedDitTags = response.body.included.filter(included => included.type === `${dit}-tags`);
            should(includedDitTags).Array().length(13);
          });

          it('[pagination] offset and limit the results', async () => {
            const response = await agent
              .get(`/${dit}s?filter[withMyTags]&page[offset]=1&page[limit]=3`)
              .expect(200);

            // we should find 3 dits
            should(response.body).have.property('data').Array().length(3);

            // sorted by sum of my tag relevances and started from the 2nd one
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([0, 2, 1].map(no => `${dit} title ${no}`));
          });
        });

        context('invalid data', () => {

          it('[invalid query.filter.withMyTags] 400', async () => {
            await agent
              .get(`/${dit}s?filter[withMyTags]=1`)
              .expect(400);
          });

          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?filter[withMyTags]&page[offset]=1&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[withMyTags]&filter[Foo]=bar`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[withMyTags]`)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s?filter[withTags]=tag0,tag1,tag2`, () => {

      let tag0,
          tag1,
          tag3,
          tag4,
          dit0,
          user0;

      // create and save testing data
      beforeEach(async () => {
        const data = {
          users: 3,
          verifiedUsers: [0, 1, 2],
          tags: 6,
          [`${dit}s`]: Array(7).fill([]),
          [`${dit}Tags`]: [
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
        [dit0] = dbData[`${dit}s`];
        [tag0, tag1,, tag3, tag4] = dbData.tags;
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid data', () => {

          it(`200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[withTags]=${tag0.tagname},${tag1.tagname},${tag3.tagname},${tag4.tagname}`)
              .expect(200);

            // we should find 6 dits...
            should(response.body).have.property('data').Array().length(6);

            // ...sorted by sum of my tag relevances
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([4, 0, 2, 1, 5, 6].map(no => `${dit} title ${no}`));

            // ditTags should be present as relationships
            should(response.body.data[1]).have.propertyByPath('relationships', `${dit}Tags`, 'data').Array().length(2);
            should(response.body.data[1].relationships[`${dit}Tags`].data[1]).deepEqual({
              type: `${dit}-tags`,
              id: `${dit0.id}--${tag1.tagname}`
            });

            // and dit-tags should be included, too
            const includedDitTags = response.body.included.filter(included => included.type === `${dit}-tags`);
            should(includedDitTags).Array().length(11);
          });

          it('[pagination] offset and limit the results', async () => {
            const response = await agent
              .get(`/${dit}s?filter[withTags]=${tag0.tagname},${tag1.tagname},${tag3.tagname},${tag4.tagname}&page[offset]=1&page[limit]=3`)
              .expect(200);

            // we should find 3 dits
            should(response.body).have.property('data').Array().length(3);

            // sorted by sum of my tag relevances and started from the 2nd one
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([0, 2, 1].map(no => `${dit} title ${no}`));
          });
        });

        context('invalid data', () => {

          it('[invalid tagnames in a list] error 400', async () => {
            await agent
              .get(`/${dit}s?filter[withTags]=invalid--tagname,other-invalid*tagname`)
              .expect(400);
          });

          it('[too many tags provided] error 400', async () => {
            await agent
              .get(`/${dit}s?filter[withTags]=t0,t1,t2,t3,t4,t5,t6,t7,t8,t9,t10`)
              .expect(400);
          });

          it('[no tags provided] error 400', async () => {
            await agent
              .get(`/${dit}s?filter[withTags]=`)
              .expect(400);
          });

          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?filter[withTags]=tag1,tag2,tag3&page[offset]=1&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[withTags]=tag&filter[Foo]=bar`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[withTags]=tag0`)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s?sort=-created (new ${dit}s)`, () => {

      let loggedUser;

      // create and save testing data
      beforeEach(async () => {
        const data = {
          users: 3,
          verifiedUsers: [0, 1, 2],
          tags: 6,
          [`${dit}s`]: Array(11).fill([])
        };

        dbData = await dbHandle.fill(data);

        loggedUser = dbData.users[0];
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid', () => {
          it(`200 and array of new ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?sort=-created`)
              .expect(200);

            // we should find 5 dits...
            should(response.body).have.property('data').Array().length(5);

            // ...sorted from newest to oldest
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([10, 9, 8, 7, 6].map(no => `${dit} title ${no}`));
          });

          it(`[pagination] 200 and array of new ${dit}s, offseted and limited`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?sort=-created&page[offset]=3&page[limit]=4`)
              .expect(200);

            // we should find 4 dits...
            should(response.body).have.property('data').Array().length(4);

            // ...sorted from newest to oldest
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([7, 6, 5, 4].map(no => `${dit} title ${no}`));
          });
        });

        context('invalid', () => {
          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?sort=-created&page[offset]=3&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?sort=-created&foo=bar`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?sort=-created`)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s?filter[random]`, () => {

      let loggedUser;

      // create and save testing data
      beforeEach(async () => {
        const data = {
          users: 3,
          verifiedUsers: [0, 1, 2],
          [`${dit}s`]: Array(11).fill([])
        };

        dbData = await dbHandle.fill(data);

        loggedUser = dbData.users[0];
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid', () => {
          it(`200 and array of random ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[random]`)
              .expect(200);

            // we should find 1 dit by default
            should(response.body).have.property('data').Array().length(1);
          });

          it(`[pagination] 200 and array of random ${dit}s, limited`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[random]&page[offset]=0&page[limit]=4`)
              .expect(200);

            // we should find 4 dits...
            should(response.body).have.property('data').Array().length(4);
          });
        });

        context('invalid', () => {
          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?filter[random]&page[offset]=3&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[random]&foo=bar`)
              .expect(400);
          });

          it('[random with value] 400', async () => {
            await agent
              .get(`/${dit}s?filter[random]=bar`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[random]`)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s?filter[creators]=user0,user1,user2`, () => {
      let user0,
          user2,
          user3,
          user4;
      // create and save testing data
      beforeEach(async () => {
        const data = {
          users: 6,
          verifiedUsers: [0, 1, 2, 3, 4],
          [`${dit}s`]: [[{}, 0], [{}, 0],[{}, 1],[{}, 2],[{}, 2],[{}, 2],[{}, 3]]
        };

        dbData = await dbHandle.fill(data);

        [user0, , user2, user3, user4, ] = dbData.users;
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid data', () => {

          it(`[one creator] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[creators]=${user2.username}`)
              .expect(200);

            // we should find 2 dits...
            should(response.body).have.property('data').Array().length(3);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([5, 4, 3].map(no => `${dit} title ${no}`));

          });


          it(`[two creators] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[creators]=${user2.username},${user3.username}`)
              .expect(200);

            // we should find 5 dits...
            should(response.body).have.property('data').Array().length(4);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([6, 5, 4, 3].map(no => `${dit} title ${no}`));
          });

          it(`[creator without ${dit}s] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[creators]=${user4.username}`)
              .expect(200);

            // we should find 0 dits...
            should(response.body).have.property('data').Array().length(0);

          });

          it('[pagination] offset and limit the results', async () => {
            const response = await agent
              .get(`/${dit}s?filter[creators]=${user2.username},${user3.username}&page[offset]=1&page[limit]=3`)
              .expect(200);

            // we should find 3 dits
            should(response.body).have.property('data').Array().length(3);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([5, 4, 3].map(no => `${dit} title ${no}`));
          });

          it(`[nonexistent creator] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[creators]=nonexistentcreator`)
              .expect(200);

            // we should find 0 dits...
            should(response.body).have.property('data').Array().length(0);

          });
        });

        context('invalid data', () => {

          it('[invalid query.filter.creators] 400', async () => {
            await agent
              .get(`/${dit}s?filter[creators]=1`)
              .expect(400);
          });

          it('[too many users] 400', async () => {
            await agent
              .get(`/${dit}s?filter[creators]=user1,user2,user3,user4,user5,user6,user7,user8,user9,user190,user11`)
              .expect(400);
          });

          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?filter[creators]=${user2.username},${user3.username}&page[offset]=1&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[creators]=${user2.username},${user3.username}&additional[param]=3&page[offset]=1&page[limit]=3`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[creators]=${user2.username}`)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s?filter[commentedBy]=user0,user1,user2`, () => {
      let user0,
          user2,
          user3,
          user4;
      // create and save testing data
      beforeEach(async () => {
        const data = {
          users: 6,
          verifiedUsers: [0, 1, 2, 3, 4],
          [`${dit}s`]: Array(7).fill([]),
          [`${dit}Comments`]: [[0, 0],[0, 1], [0,2],[0,2], [0,4], [1,1], [1,2], [2,1], [2,2], [3,4] ]
        };

        dbData = await dbHandle.fill(data);

        [user0, , user2, user3, user4, ] = dbData.users;
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid data', () => {

          it(`[${dit}s commented by one user] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[commentedBy]=${user2.username}`)
              .expect(200);

            // we should find 3 dit...
            should(response.body).have.property('data').Array().length(3);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([2, 1, 0].map(no => `${dit} title ${no}`));

          });


          it(`[${dit}s commented by two users] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[commentedBy]=${user2.username},${user4.username}`)
              .expect(200);

            // we should find 4 dits...
            should(response.body).have.property('data').Array().length(4);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([3, 2, 1, 0].map(no => `${dit} title ${no}`));
          });

          it(`[${dit}s commented by user who didn't commented anyting] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[commentedBy]=${user3.username}`)
              .expect(200);

            // we should find 0 dits...
            should(response.body).have.property('data').Array().length(0);

          });

          it('[pagination] offset and limit the results', async () => {
            const response = await agent
              .get(`/${dit}s?filter[commentedBy]=${user2.username},${user4.username}&page[offset]=1&page[limit]=3`)
              .expect(200);

            // we should find 3 dits
            should(response.body).have.property('data').Array().length(3);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([2, 1, 0].map(no => `${dit} title ${no}`));
          });

          it(`[nonexistent user who commented] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[commentedBy]=nonexistentuser`)
              .expect(200);

            // we should find 0 dits...
            should(response.body).have.property('data').Array().length(0);

          });
        });

        context('invalid data', () => {

          it('[invalid query.filter.commentedBy] 400', async () => {
            await agent
              .get(`/${dit}s?filter[commentedBy]=1`)
              .expect(400);
          });

          it('[too many users] 400', async () => {
            await agent
              .get(`/${dit}s?filter[commentedBy]=user1,user2,user3,user4,user5,user6,user7,user8,user9,user190,user11`)
              .expect(400);
          });

          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?filter[commentedBy]=${user2.username},${user3.username}&page[offset]=1&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[commentedBy]=${user2.username},${user3.username}&additional[param]=3&page[offset]=1&page[limit]=3`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[commentedBy]=${user2.username}`)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s?filter[highlyVoted]=voteSumBottomLimit`, () => {
      let user0;
      // create and save testing data
      beforeEach(async () => {
        const primarys = `${dit}s`;
        const data = {
          users: 6,
          verifiedUsers: [0, 1, 2, 3, 4],
          [`${dit}s`]: Array(7).fill([]),
          // dits with votes: 3:3, 1:3, 5:1, 2:1, 0:0, 6: -1, 4:-2
          votes: [
            [0, [primarys, 0], -1],
            [1, [primarys, 0],  1],
            [0, [primarys, 1],  1],
            [1, [primarys, 1],  1],
            [2, [primarys, 1],  1],
            [0, [primarys, 2], -1],
            [1, [primarys, 2],  1],
            [2, [primarys, 2],  1],
            [0, [primarys, 3],  1],
            [1, [primarys, 3],  1],
            [2, [primarys, 3],  1],
            [3, [primarys, 3],  1],
            [4, [primarys, 3], -1],
            [0, [primarys, 4], -1],
            [1, [primarys, 4], -1],
            [3, [primarys, 5],  1],
            [3, [primarys, 6], -1]
          ]
        };

        dbData = await dbHandle.fill(data);

        [user0, , , , , ] = dbData.users;
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid data', () => {

          it(`[highly voted ${dit}s] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[highlyVoted]=0`)
              .expect(200);

            // without pagination, limit for ideas 5 we should find 5 dits...
            should(response.body).have.property('data').Array().length(5);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([3, 1, 5, 2, 0].map(no => `${dit} title ${no}`));

          });

          it(`[highly voted ${dit}s with at least 2 votes in plus] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[highlyVoted]=2`)
              .expect(200);

            // without pagination, limit for ideas 5 we should find 5 dits...
            should(response.body).have.property('data').Array().length(2);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([3, 1].map(no => `${dit} title ${no}`));

            // shoud value be at least 2
            should(Math.min(...response.body.data.map(dit => dit.meta.voteSum)))
              .aboveOrEqual(2);
          });


          it('[pagination] offset and limit the results', async () => {
            const response = await agent
              .get(`/${dit}s?filter[highlyVoted]=0&page[offset]=1&page[limit]=3`)
              .expect(200);

            // we should find 3 dits
            should(response.body).have.property('data').Array().length(3);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([1, 5, 2].map(no => `${dit} title ${no}`));
          });

        });

        context('invalid data', () => {

          it('[invalid query.filter.highlyVoted] 400', async () => {
            await agent
              .get(`/${dit}s?filter[highlyVoted]=string`)
              .expect(400);
          });

          it('[invalid query.filter.highlyVoted] 400', async () => {
            await agent
              .get(`/${dit}s?filter[highlyVoted]`)
              .expect(400);
          });

          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?filter[highlyVoted]=0&page[offset]=1&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[highlyVoted]=0&additional[param]=3&page[offset]=1&page[limit]=3`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[highlyVoted]=0`)
            .expect(403);
        });
      });
    });
    // ///////////////////////////////// TUTAJ
    describe(`GET /${dit}s?filter[trending]`, () => {
      let user0,
          user1,
          user2,
          user3,
          user4,
          user5,
          user6,
          user7,
          user8,
          dit1,
          dit2,
          dit3,
          dit4,
          dit5,
          dit6;
      const now = Date.now();
      let sandbox;
      const threeMonths = 7776000000;
      const threeWeeks = 1814400000;
      const oneWeek = 604800000;
      const twoDays = 172800000;
      // create and save testing data
      beforeEach(async () => {
        sandbox = sinon.sandbox.create();
        const primarys = `${dit}s`;
        const data = {
          users: 10,
          verifiedUsers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          [`${dit}s`]: Array(11).fill([]),
          // dits with votes: 3:3, 1:3, 5:1, 2:1, 0:0, 6: -1, 4:-2
          votes: [
            [0, [primarys, 1], 1],
            [0, [primarys, 2], 1],
            [0, [primarys, 3], 1],
            [1, [primarys, 3], 1],
            [2, [primarys, 3], 1],
            [0, [primarys, 4], 1],
            [1, [primarys, 4], 1],
            [2, [primarys, 4], 1],
            [3, [primarys, 4], 1],
            [4, [primarys, 4], 1],
            [0, [primarys, 5], 1],
            [1, [primarys, 5], 1],
            [2, [primarys, 5], 1],
            [3, [primarys, 5], 1],
            [4, [primarys, 5], 1],
            [5, [primarys, 5], 1],
            [6, [primarys, 5], 1],
            [0, [primarys, 6], 1],
            [1, [primarys, 6], 1]
          ]
        };
        // post initial data and oldest votes with date three monts ago without two days
        sandbox.useFakeTimers(now - threeMonths + twoDays);
        dbData = await dbHandle.fill(data);

        [user0, user1, user2, user3, user4, user5, user6, user7, user8 ] = dbData.users;
        [ , dit1, dit2, dit3, dit4, dit5, dit6] = dbData[`${dit}s`];

        // create data to post with time: three weeks ago
        const dataThreeWeeksAgo = {
          votes: [
            {from: user1.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user1.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user2.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user3.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user3.username, to: {type: primarys, id: dit3.id}, value: 1},
            {from: user5.username, to: {type: primarys, id: dit4.id}, value: 1},
            {from: user6.username, to: {type: primarys, id: dit4.id}, value: 1},
            {from: user7.username, to: {type: primarys, id: dit4.id}, value: 1},
            {from: user7.username, to: {type: primarys, id: dit5.id}, value: 1},
            {from: user2.username, to: {type: primarys, id: dit6.id}, value: 1},
            {from: user3.username, to: {type: primarys, id: dit6.id}, value: 1}
          ]
        };
        // stub time to three weeks ago without two days
        sandbox.clock.restore();
        sandbox.useFakeTimers(now - threeWeeks + twoDays);
        // add data to database hree weeks ago without two days
        for(const i in dataThreeWeeksAgo.votes){
          await models.vote.create(dataThreeWeeksAgo.votes[i]);
        }

        const dataOneWeekAgo = {
          votes: [
            {from: user2.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user3.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user4.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user5.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user6.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user7.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user8.username, to: {type: primarys, id: dit1.id}, value: 1},
            {from: user4.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user5.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user6.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user7.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user8.username, to: {type: primarys, id: dit2.id}, value: 1},
            {from: user4.username, to: {type: primarys, id: dit3.id}, value: 1},
            {from: user5.username, to: {type: primarys, id: dit3.id}, value: 1},
            {from: user6.username, to: {type: primarys, id: dit3.id}, value: 1},
            {from: user7.username, to: {type: primarys, id: dit3.id}, value: 1},
            {from: user8.username, to: {type: primarys, id: dit3.id}, value: 1},
            {from: user8.username, to: {type: primarys, id: dit4.id}, value: 1},
            {from: user8.username, to: {type: primarys, id: dit5.id}, value: 1},
            {from: user4.username, to: {type: primarys, id: dit6.id}, value: 1},
            {from: user5.username, to: {type: primarys, id: dit6.id}, value: 1}
          ]
        };
        // stub time to one week ago without two days
        sandbox.clock.restore();
        sandbox.useFakeTimers( now - oneWeek + twoDays);
        for(const i in dataOneWeekAgo.votes){
          await models.vote.create(dataOneWeekAgo.votes[i]);
        }
        sandbox.clock.restore();
      });
      afterEach(async () => {
        sandbox.restore();
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid data', () => {

          it(`[trending] 200 and return array of matched ${dit}s`, async () => {
            // request
            const response = await agent
              .get(`/${dit}s?filter[trending]`)
              .expect(200);
            // without pagination, limit for dits 5 we should find 5 dits...
            should(response.body).have.property('data').Array().length(5);

            // sorted by trending rate
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([1, 2, 3, 6, 4].map(no => `${dit} title ${no}`));

          });

          it('[trending with pagination] offset and limit the results', async () => {
            const response = await agent
              .get(`/${dit}s?filter[trending]&page[offset]=1&page[limit]=3`)
              .expect(200);

            // we should find 3 dits
            should(response.body).have.property('data').Array().length(3);

            // sorted by trending rate
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([2, 3, 6].map(no => `${dit} title ${no}`));
          });

        });

        context('invalid data', () => {

          it('[trending invalid query.filter.highlyRated] 400', async () => {
            await agent
              .get(`/${dit}s?filter[trending]=string&page[offset]=1&page[limit]=3`)
              .expect(400);
          });

          it('[trending invalid query.filter.highlyRated] 400', async () => {
            await agent
              .get(`/${dit}s?filter[trending]=1&page[offset]=1&page[limit]=3`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[trending]&additional[param]=3&page[offset]=1&page[limit]=3`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[trending]`)
            .expect(403);
        });
      });
    });

    describe(`GET /${dit}s?filter[title][like]=string1,string2,string3`, () => {
      let user0;
      // create and save testing data
      beforeEach(async () => {
        const data = {
          users: 2,
          verifiedUsers: [0],
          [`${dit}s`]: [ [{title:`${dit}-title1`}, 0], [{title:`${dit}-title2-keyword1`}, 0], [{title:`${dit}-title3-keyword2`}, 0], [{title:`${dit}-title4-keyword3`}, 0], [{title:`${dit}-title5-keyword2-keyword3`}, 0], [{title:`${dit}-title6-keyword1`}, 0], [{title:`${dit}-title7-keyword1-keyword4`}, 0] ]
        };

        dbData = await dbHandle.fill(data);

        [user0, ] = dbData.users;
      });

      context('logged in', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid data', () => {

          it(`[find ${dit}s with one word] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[title][like]=keyword1`)
              .expect(200);

            // we should find 2 dits...
            should(response.body).have.property('data').Array().length(3);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([`${dit}-title2-keyword1`,`${dit}-title6-keyword1`, `${dit}-title7-keyword1-keyword4`]);

          });


          it(`[find ${dit}s with two words] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[title][like]=keyword2,keyword3`)
              .expect(200);

            // we should find 4 dits...
            should(response.body).have.property('data').Array().length(3);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([`${dit}-title5-keyword2-keyword3`, `${dit}-title3-keyword2`, `${dit}-title4-keyword3`]);
          });

          it(`[find ${dit}s with word not present in any] 200 and return array of matched ${dit}s`, async () => {

            // request
            const response = await agent
              .get(`/${dit}s?filter[title][like]=keyword10`)
              .expect(200);

            // we should find 0 dits...
            should(response.body).have.property('data').Array().length(0);

          });

          it('[pagination] offset and limit the results', async () => {
            const response = await agent
              .get(`/${dit}s?filter[title][like]=keyword1&page[offset]=1&page[limit]=2`)
              .expect(200);

            // we should find 3 dits
            should(response.body).have.property('data').Array().length(2);

            // sorted by creation date desc
            should(response.body.data.map(dit => dit.attributes.title))
              .eql([`${dit}-title6-keyword1`, `${dit}-title7-keyword1-keyword4`]);
          });

          it('should be fine to provide a keyword which includes empty spaces and/or special characters', async () => {
            // request
            await agent
              .get(`/${dit}s?filter[title][like]=keyword , aa,1-i`)
              .expect(200);
          });

        });

        context('invalid data', () => {

          it('[too many keywords] 400', async () => {
            await agent
              .get(`/${dit}s?filter[title][like]=keyword1,keyword2,keyword3,keyword4,keyword5,keyword6,keyword7,keyword8,keyword9,keyword10,keyword11`)
              .expect(400);
          });

          it('[empty keywords] 400', async () => {
            await agent
              .get(`/${dit}s?filter[title][like]=keyword1,`)
              .expect(400);
          });

          it('[too long keywords] 400', async () => {
            await agent
              .get(`/${dit}s?filter[title][like]=keyword1,${'a'.repeat(257)}`)
              .expect(400);
          });

          it('[keywords spaces only] 400', async () => {
            await agent
              .get(`/${dit}s?filter[title][like]=  ,keyword2`)
              .expect(400);
          });

          it('[invalid pagination] 400', async () => {
            await agent
              .get(`/${dit}s?filter[title][like]=keyword1&page[offset]=1&page[limit]=21`)
              .expect(400);
          });

          it('[unexpected query params] 400', async () => {
            await agent
              .get(`/${dit}s?filter[title][like]=keyword1&additional[param]=3&page[offset]=1&page[limit]=3`)
              .expect(400);
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .get(`/${dit}s?filter[title][like]=keyword1`)
            .expect(403);
        });
      });
    });
  });
}