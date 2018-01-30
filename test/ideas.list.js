'use strict';

const should = require('should');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database');

describe('read lists of ideas', () => {

  let agent,
      dbData,
      tag1,
      idea0,
      user0;

  // default supertest agent (not logged in)
  beforeEach(() => {
    agent = agentFactory();
  });

  // clear database after each test
  afterEach(async () => {
    await dbHandle.clear();
  });

  describe('GET /ideas?filter[withMyTags]', () => {

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
});
