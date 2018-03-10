'use strict';

const path = require('path'),
      should = require('should'),
      sinon = require('sinon');

const agentFactory = require('./agent'),
      dbHandle = require('./handle-database'),
      models = require(path.resolve('./models'));

commentTestsFactory('idea');
commentTestsFactory('comment');

/**
 * Run tests for comments or reactions
 * @param {string} primary - idea, comment, ...
 */
function commentTestsFactory(primary, only=false) {

  // plural of primary
  const primarys = primary + 's';
  const comment = (primary === 'comment') ? 'reaction' : 'comment';
  const comments = comment + 's';

  const isReactions = comment === 'reaction';

  const ds = (only) ? describe.only : describe;


  ds(`${comments} of ${primary}`, () => {

    // declare some variables
    let agent,
        dbData,
        sandbox;

    // default (not logged) supertest agent
    beforeEach(() => {
      agent = agentFactory();
    });

    // clear database
    afterEach(async () => {
      await dbHandle.clear();
    });

    // sinon sandbox and set fake testing time
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      sandbox.useFakeTimers({
        now: 1500000000000,
        toFake: ['Date']
      });
    });

    // reset sinon sandbox
    afterEach(() => {
      sandbox.restore();
    });

    describe(`POST /${primarys}/:id/${comments}`, () => {

      // declare variables
      let existentPrimary,
          loggedUser,
          requestBody;

      if (isReactions) {
        // save testing data to database
        beforeEach(async () => {
          const data = {
            users: 3,
            verifiedUsers: [0, 1],
            ideas: Array(1).fill([]),
            ideaComments: [[0, 0]]
          };

          dbData = await dbHandle.fill(data);

          existentPrimary = dbData.ideaComments[0];
          loggedUser = dbData.users[0];
        });
      } else {
        // save testing data to database
        beforeEach(async () => {
          const data = {
            users: 3,
            verifiedUsers: [0, 1],
            ideas: Array(1).fill([])
          };

          dbData = await dbHandle.fill(data);

          existentPrimary = dbData[primarys][0];
          loggedUser = dbData.users[0];
        });
      }

      // create request body
      beforeEach(() => {
        requestBody = { data: {
          type: comments,
          attributes: {
            content: `this is the ${primary} ${comment}.`
          }
        } };
      });

      context('logged in', () => {

        // log in supertest agent
        beforeEach(() => {
          agent = agentFactory.logged(loggedUser);
        });

        context('valid', () => {
          it(`201 and create ${comment}`, async () => {
            // send the request
            const response = await agent
              .post(`/${primarys}/${existentPrimary.id}/${comments}`)
              .send(requestBody)
              .expect(201);

            const commentId = response.body.data.id;

            // check that new comment or reaction is present in database
            const dbComment = await models.comment.read(commentId, comments);
            should(dbComment).match({
              content: `this is the ${primary} ${comment}.`,
              id: commentId,
              creator: { username: loggedUser.username },
              primary: { type: primarys, id: existentPrimary.id }
            });

            // check that the response body has a correct format
            should(response.body).match({
              data: {
                type: comments,
                id: commentId,
                attributes: {
                  content: `this is the ${primary} ${comment}.`,
                  created: Date.now()
                },
                relationships: {
                  primary: {
                    data: {
                      type: primarys,
                      id: existentPrimary.id
                    },
                  },
                  creator: {
                    data: {
                      type: 'users',
                      id: loggedUser.username
                    }
                  }
                }
              }
            });
          });

          it(`[nonexistent ${primary}] 404`, async () => {
            const response = await agent
              .post(`/${primarys}/000111222/${comments}`)
              .send(requestBody)
              .expect(404);

            should(response.body).deepEqual({
              errors: [{ status: 404, detail: 'primary document not found' }]
            });
          });
        });

        context('invalid', () => {

          it(`[invalid ${primary} id] 400`, async () => {
            await agent
              .post(`/${primarys}/invalid-id/${comments}`)
              .send(requestBody)
              .expect(400);
          });

          it(`[empty ${comment} content] 400`, async () => {
            requestBody.data.attributes.content = '   ';

            await agent
              .post(`/${primarys}/${existentPrimary.id}/${comments}`)
              .send(requestBody)
              .expect(400);
          });

          it(`[too long ${comment} content] 400`, async () => {
            requestBody.data.attributes.content = 'a'.repeat(1025);

            await agent
              .post(`/${primarys}/${existentPrimary.id}/${comments}`)
              .send(requestBody)
              .expect(400);
          });

          it(`[missing ${comment} content] 400`, async () => {
            delete requestBody.data.attributes.content;

            await agent
              .post(`/${primarys}/${existentPrimary.id}/${comments}`)
              .send(requestBody)
              .expect(400);
          });

          it('[additional property] 400', async () => {
            requestBody.data.attributes.foo = 'bar';

            await agent
              .post(`/${primarys}/${existentPrimary.id}/${comments}`)
              .send(requestBody)
              .expect(400);
          });

          it('[contains invalid html] strip invalid html and 201', async () => {
            requestBody.data.attributes.content = '<script>alert(\'hacked!\');</script>ok text<i>ok html</i>';

            const response = await agent
              .post(`/${primarys}/${existentPrimary.id}/${comments}`)
              .send(requestBody)
              .expect(201);

            // check that the response body is correct
            // and invalid html is removed and valid html is kept
            should(response.body).propertyByPath('data', 'attributes', 'content')
              .eql('ok text<i>ok html</i>');
          });
        });
      });

      context('not logged in', () => {
        it('403', async () => {
          await agent
            .post(`/${primarys}/${existentPrimary.id}/${comments}`)
            .send(requestBody)
            .expect(403);
        });
      });
    });


    if (!isReactions) {
      describe(`GET /${primarys}/:id/comments`, () => {

        // declare variables
        let primary0,
            primary2,
            loggedUser;

        // save testing data to database
        beforeEach(async () => {
          const data = {
            users: 4,
            verifiedUsers: [0, 1, 2, 3],
            ideas: Array(3).fill([]),
            ideaComments: [
              [0, 0], [0, 1], [0, 1], [0, 2], [0, 1], [0, 1], [0, 0], [0, 3],
              [1, 0], [1, 0], [1, 2],
              [2, 0], [2, 1], [2, 1], [2, 2], [2, 1], [2, 1], [2, 0], [2, 3],
              [2, 0], [2, 1], [2, 1], [2, 2], [2, 1], [2, 1], [2, 0], [2, 3]
            ],
            reactions: [[0, 0], [0, 1], [0, 3], [1, 0]]
          };

          dbData = await dbHandle.fill(data);

          [primary0,, primary2] = dbData.ideas;
          loggedUser = dbData.users[0];
        });

        context('logged', () => {

          // log in supertest agent
          beforeEach(() => {
            agent = agentFactory.logged(loggedUser);
          });

          context('valid', () => {
            it('200 and list of comments', async () => {
              const response = await agent
                .get(`/${primarys}/${primary0.id}/comments`)
                .expect(200);

              should(response.body).have.property('data').Array().length(8);

              should(response.body.data.map(comment => comment.attributes.content))
                .eql([0, 1, 2, 3, 4, 5, 6, 7].map(no => `${primary} comment ${no}`));
            });

            it('include also reactions to comments', async () => {
              const response = await agent
                .get(`/${primarys}/${primary0.id}/comments`)
                .expect(200);

              should(response.body.data[0]).have.propertyByPath('relationships', 'reactions', 'data').Array().length(3);

              const reaction0 = dbData.reactions[0];

              // are reactions ok?
              should(response.body.data[0].relationships.reactions.data[0]).match({
                type: 'reactions',
                id: reaction0.id
              });

              // are reactions included?
              should(response.body.included).Array();
              const includedReactions = response.body.included.filter(include => include.type === 'reactions');

              should(includedReactions).Array().length(4);

              should(includedReactions[0]).match({
                type: 'reactions',
                id: reaction0.id,
                attributes: {
                  content: reaction0.content,
                  created: reaction0.created
                },
                relationships: {
                  creator: {
                    data: {
                      type: 'users',
                      id: reaction0.creator.username
                    }
                  },
                  primary: {
                    data: {
                      type: 'comments',
                      id: reaction0.comment.id
                    }
                  }
                }
              });
            });

            it('pagination', async () => {
              const response = await agent
                .get(`/${primarys}/${primary0.id}/comments?page[offset]=2&page[limit]=5`)
                .expect(200);

              should(response.body).have.property('data').Array().length(5);

              should(response.body.data.map(comment => comment.attributes.content))
                .eql([2, 3, 4, 5, 6].map(no => `${primary} comment ${no}`));
            });

            it('when pagination not specified, fetch all', async () => {
              const response = await agent
                .get(`/${primarys}/${primary2.id}/comments`)
                .expect(200);

              should(response.body).have.property('data').Array().length(16);
            });

            it('sort from newest to oldest', async () => {
              const response = await agent
                .get(`/${primarys}/${primary0.id}/comments?page[offset]=2&page[limit]=5&sort=-created`)
                .expect(200);

              should(response.body).have.property('data').Array().length(5);

              should(response.body.data.map(comment => comment.attributes.content))
                .eql([5, 4, 3, 2, 1].map(no => `${primary} comment ${no}`));
            });

            it(`[${primary} doesn\`t exist] 404`, async () => {
              const response = await agent
                .get(`/${primarys}/000111222/comments`)
                .expect(404);

              should(response.body).deepEqual({ errors: [{ status: 404, detail: `${primary} not found` }] });
            });
          });

          context('invalid', () => {

            it(`[invalid ${primary} id] 400`, async () => {
              await agent
                .get(`/${primarys}/invalid-id/comments`)
                .expect(400);
            });

            it('[invalid pagination] 400', async () => {
              await agent
                .get(`/${primarys}/${primary0.id}/comments?page[offset]=1&page[limit]=21`)
                .expect(400);
            });

            it('[invalid sort] 400', async () => {
              await agent
                .get(`/${primarys}/${primary0.id}/comments?sort=-foo`)
                .expect(400);
            });

            it('[additional query params] 400', async () => {
              await agent
                .get(`/${primarys}/${primary0.id}/comments?foo=bar`)
                .expect(400);
            });
          });
        });

        context('not logged', () => {
          it('403', async () => {
            await agent
              .get(`/${primarys}/${primary0.id}/comments`)
              .expect(403);
          });
        });
      });
    }

    describe(`PATCH /${comments}/:id`, () => {
      // declare variables
      let comment00,
          comment01,
          primary0,
          patchBody,
          user0;

      if (isReactions) {
        // save testing data to database
        beforeEach(async () => {
          const data = {
            users: 2,
            verifiedUsers: [0, 1],
            ideas: Array(1).fill([]),
            ideaComments: [[0, 0]],
            reactions: [[0, 0], [0, 1]]
          };

          dbData = await dbHandle.fill(data);

          primary0 = dbData.comments[0];
          [user0] = dbData.users;
          [comment00, comment01] = dbData.reactions;
        });
      } else {
        // save testing data to database
        beforeEach(async () => {
          const data = {
            users: 2,
            verifiedUsers: [0, 1],
            ideas: Array(1).fill([]),
            ideaComments: [
              [0, 0], [0, 1],
            ]
          };

          dbData = await dbHandle.fill(data);

          primary0 = dbData.ideas[0];
          [user0] = dbData.users;
          [comment00, comment01] = dbData.ideaComments;
        });
      }

      // valid request body
      beforeEach(() => {
        patchBody = { data: {
          type: comments,
          id: comment00.id,
          attributes: {
            content: 'updated content'
          }
        } };
      });

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid', () => {

          it(`200, update ${comment} content and respond with updated`, async () => {

            const response = await agent
              .patch(`/${comments}/${comment00.id}`)
              .send(patchBody)
              .expect(200);

            // check that comment or reaction is updated in database
            const dbComment = await models.comment.read(comment00.id, comments);
            should(dbComment).match({
              content: 'updated content',
              id: comment00.id
            });

            // check that the response body has a correct format
            should(response.body).match({
              data: {
                type: comments,
                id: comment00.id,
                attributes: {
                  content: 'updated content',
                },
                relationships: {
                  primary: {
                    data: {
                      type: primarys,
                      id: primary0.id
                    },
                  },
                  creator: {
                    data: {
                      type: 'users',
                      id: user0.username
                    }
                  }
                }
              }
            });
          });

          it(`[nonexistent ${comment}] 404`, async () => {
            patchBody.data.id = '111222333';

            const response = await agent
              .patch(`/${comments}/111222333`)
              .send(patchBody)
              .expect(404);

            should(response.body).deepEqual({
              errors: [
                { status: 404, detail: `${comment} not found` }
              ]
            });
          });

          it('[not creator] 403', async () => {
            patchBody.data.id = comment01.id;

            const response = await agent
              .patch(`/${comments}/${comment01.id}`)
              .send(patchBody)
              .expect(403);

            should(response.body).deepEqual({
              errors: [
                { status: 403, detail: 'not a creator' }
              ]
            });
          });
        });

        context('invalid', () => {
          it('[invalid id] 400', async () => {
            patchBody.data.id = 'invalid--id';

            await agent
              .patch(`/${comments}/invalid--id`)
              .send(patchBody)
              .expect(400);
          });

          it('[body.id doesn\'t equal params.id]', async () => {
            patchBody.data.id = '111222333';

            await agent
              .patch(`/${comments}/${comment00.id}`)
              .send(patchBody)
              .expect(400);
          });

          it('[invalid content] 400', async () => {
            patchBody.data.attributes.content = '  ';

            await agent
              .patch(`/${comments}/${comment00.id}`)
              .send(patchBody)
              .expect(400);
          });

          it('[missing content] 400', async () => {
            delete patchBody.data.attributes.content;

            await agent
              .patch(`/${comments}/${comment00.id}`)
              .send(patchBody)
              .expect(400);
          });

          it('[unexpected body params] 400', async () => {
            patchBody.data.attributes.foo = 'bar';

            await agent
              .patch(`/${comments}/${comment00.id}`)
              .send(patchBody)
              .expect(400);
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          const response = await agent
            .patch(`/${comments}/${comment00.id}`)
            .send(patchBody)
            .expect(403);

          // shouldn't be the error of "logged, not creator"
          should(response.body).not.deepEqual({
            errors: [
              { status: 403, detail: 'not a creator' }
            ]
          });
        });
      });
    });

    describe(`DELETE /${comments}/:id`, () => {
      // declare variables
      let comment00,
          comment01,
          user0;

      if (isReactions) {
        // save testing data to database
        beforeEach(async () => {
          const data = {
            users: 2,
            verifiedUsers: [0, 1],
            ideas: Array(1).fill([]),
            ideaComments: [[0, 0]],
            reactions: [[0, 0], [0, 1]]
          };

          dbData = await dbHandle.fill(data);

          [user0] = dbData.users;
          [comment00, comment01] = dbData.reactions;
        });
      } else {
        // save testing data to database
        beforeEach(async () => {
          const data = {
            users: 2,
            verifiedUsers: [0, 1],
            ideas: Array(1).fill([]),
            ideaComments: [
              [0, 0], [0, 1],
            ],
            reactions: [[0, 0], [0, 1], [1, 0]]
          };

          dbData = await dbHandle.fill(data);

          [user0] = dbData.users;
          [comment00, comment01] = dbData.ideaComments;
        });
      }

      context('logged', () => {

        beforeEach(() => {
          agent = agentFactory.logged(user0);
        });

        context('valid', () => {

          it(`204 and remove ${comment}`, async () => {
            await agent
              .delete(`/${comments}/${comment00.id}`)
              .expect(204);

            // check that comment is removed from database
            const dbComment = await models.comment.read(comment00.id, comments);
            should(dbComment).null();
          });

          if (!isReactions) {
            it('remove the orphaned reactions, too', async () => {
              await agent
                .delete(`/${comments}/${comment00.id}`)
                .expect(204);

              // check that the right reactions are removed from database
              const [reaction00, reaction01, reaction10] = dbData.reactions;
              const dbReaction00 = await models.comment.read(reaction00.id, 'reactions');
              const dbReaction01 = await models.comment.read(reaction01.id, 'reactions');
              const dbReaction10 = await models.comment.read(reaction10.id, 'reactions');

              should(dbReaction00).null();
              should(dbReaction01).null();
              should(dbReaction10).not.null();
            });
          }

          it(`[nonexistent ${comment}] 404`, async () => {
            const response = await agent
              .delete(`/${comments}/123456`)
              .expect(404);

            should(response.body).deepEqual({ errors: [{ status: 404, detail: `${comment} not found` }] });
          });

          it('[not creator] 403', async () => {
            const response = await agent
              .delete(`/${comments}/${comment01.id}`)
              .expect(403);

            should(response.body).deepEqual({
              errors: [
                { status: 403, detail: 'not a creator' }
              ]
            });
          });
        });

        context('invalid', () => {
          it('[invalid id] 400', async () => {
            await agent
              .delete(`/${comments}/invalid--id`)
              .expect(400);
          });
        });
      });

      context('not logged', () => {
        it('403', async () => {
          const response = await agent
            .delete(`/${comments}/${comment00.id}`)
            .expect(403);

          should(response.body).not.deepEqual({
            errors: [
              { status: 403, detail: 'not a creator' }
            ]
          });
        });
      });

    });
  });

}

