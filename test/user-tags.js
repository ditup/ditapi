'use strict';

const supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      path = require('path');

const app = require(path.resolve('./app')),
      models = require(path.resolve('./models')),
      dbHandle = require(path.resolve('./test/handleDatabase')),
      config = require(path.resolve('./config/config'));

const agent = supertest.agent(app);

describe('Tags of user', function () {
  let dbData,
      loggedUser,
      otherUser,
      sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers(1500000000, 'Date');
  });

  afterEach(function () {
    sandbox.restore();
  });

  /**
   * Fill and clear the database with this function
   * @param {Object} data - TODO (it's a complex object)
   */
  function beforeEachPopulate(data) {
    // put pre-data into database
    beforeEach(async function () {
      // create data in database
      dbData = await dbHandle.fill(data);
    });

    afterEach(async function () {
      await dbHandle.clear();
    });
  }

  describe('/users/:username/tags', function () {
    describe('GET', function () {
      let loggedUser, taggedUser;

      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 8,
        userTag: [
          [1, 0, 'story', 3],
          [1, 1, 'story', 1],
          [1, 3, 'story', 2],
          [1, 4, 'story', 5],
          [1, 5, 'story', 5],
        ]
      });

      beforeEach(function () {
        [loggedUser, taggedUser] = dbData.users;
      });

      it('list of user\'s tags', // (may include user's story about the tag)
        async function () {
          const response = await agent
            .get(`/users/${taggedUser.username}/tags`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const userTags = response.body;

          should(userTags).have.propertyByPath('links', 'self')
            .eql(`${config.url.all}/users/${taggedUser.username}/tags`);

          userTags.should.have.property('data');
          should(userTags.data).have.length(5);

          const [firstTag] = userTags.data;

          const expectedTagname = dbData.userTag[3].tag.tagname;

          should(firstTag).have.property('type', 'user-tags');
          should(firstTag).have.property('attributes');
          should(firstTag).have.property('id',
            `${taggedUser.username}--${expectedTagname}`);

          const attrs = firstTag.attributes;

          should(attrs).have.properties({
            story: 'story',
            relevance: 5,
            username: taggedUser.username,
            tagname: expectedTagname
          });

        }
      );

      it('should include the tags themselves as relationships', async function () {
        const response = await agent
          .get(`/users/${taggedUser.username}/tags`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const userTags = response.body;
        const [firstTag] = userTags.data;

        should(firstTag).have.propertyByPath('relationships', 'tag');
        should(firstTag).have.propertyByPath('relationships', 'user');

        const user = firstTag.relationships.user;
        const tag = firstTag.relationships.tag;

        should(user).have.property('data').deepEqual({
          type: 'users',
          id: 'user1'
        });

        should(tag).have.property('data').deepEqual({
          type: 'tags',
          id: 'tag4'
        });

        // should(tag).have.property('links');

        should(userTags).have.property('included');

        should(userTags.included).containDeep([{
          type: 'users',
          id: 'user1',
          attributes: {
            username: 'user1',
            givenName: '',
            familyName: ''
          },
          links: {
            self: `${config.url.all}/users/user1`
          }
        }]);

        should(userTags.included).containDeep([{
          type: 'tags',
          id: 'tag4',
          attributes: {
            tagname: dbData.tags[4].tagname
          },
          links: {
            self: `${config.url.all}/tags/tag4`
          }
        }]);

      });

    });

    describe('POST', function () {
      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 2,
        userTag: [
          [0, 1, 'story']
        ]
      });

      beforeEach(function () {
        [loggedUser, otherUser] = dbData.users;
      });

      context('logged in', function () {

        it('[self] add a tag to the user and respond 201', async function () {

          const [tag] = dbData.tags;

          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: 'a new testing story',
                  relevance: 3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: tag.tagname
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(201)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const userTag = response.body;
          userTag.should.have.property('data');
          userTag.should.have.property('links');
          // userTag.should.have.property('meta');

          const data = userTag.data;
          const links = userTag.links;
          // let meta = userTag.meta;

          data.should.have.property('type', 'user-tags');
          data.should.have.property('id',
            `${loggedUser.username}--${tag.tagname}`);

          links.should.have.property('self', `${config.url.all}/users/${loggedUser.username}/tags/${tag.tagname}`);
          // links.should.have.property('related', `${config.url.all}/users/${loggedUser.username}/tags/${newUserTag.tagname}`);

          data.should.have.property('attributes');

          const attributes = data.attributes;

          attributes.should.have.property('story', 'a new testing story');
          attributes.should.have.property('relevance', 3);

          const userTagDb = await models.userTag.read(loggedUser.username,
            tag.tagname);
          userTagDb.should.have.property('story', 'a new testing story');
          // userTagDb.should.have.property('relevance', newUserTag.relevance);
          userTagDb.should.have.property('user');
          userTagDb.should.have.property('tag');
          userTagDb.created.should.eql(Date.now());
        });

        it('[other user] error 403', async function () {

          const [tag] = dbData.tags;
          const response = await agent
            .post(`/users/${otherUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: 'a new testing story',
                  relevance: 3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: tag.tagname
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const output = response.body;
          output.should.have.property('errors');
        });

        it('[duplicate relation] error 409', async function () {
          const [, tag] = dbData.tags;
          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: 'a new testing story',
                  relevance: 3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: tag.tagname
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(409)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const output = response.body;
          output.should.have.property('errors');
        });

        it('[nonexistent tagname] error 404', async function () {
          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: 'a new testing story',
                  relevance: 3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: 'nonexistent-tagname'
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const output = response.body;
          output.should.have.property('errors');
        });

        it('[invalid tagname] 400', async function () {

          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: 'a new testing story',
                  relevance: 3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: 'invalid tagname'
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', '0', 'title').eql('invalid tagname');
        });

        it('[invalid story] 400', async function () {

          const [tag] = dbData.tags;

          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: '.'.repeat(1025),
                  relevance: 3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: tag.tagname
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', '0', 'title').eql('invalid story');
        });

        it('[invalid relevance] 400', async function () {

          const [tag] = dbData.tags;

          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: '.'.repeat(1024),
                  relevance: 3.3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: tag.tagname
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', '0', 'title').eql('invalid relevance');
        });
        it('[invalid attributes present] 400', async function () {

          const [tag] = dbData.tags;

          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: '.'.repeat(1024),
                  relevance: 3,
                  invalid: 'invalid attribute'
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: tag.tagname
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', '0', 'title').eql('invalid attributes');
          should(response.body).have.propertyByPath('errors', '0', 'detail').eql('unexpected attribute');
        });

        it('[missing attributes] 400', async function () {

          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: '.'.repeat(1024),
                  relevance: 3
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          should(response.body).have.propertyByPath('errors', '0', 'title').eql('invalid attributes');
          should(response.body).have.propertyByPath('errors', '0', 'detail').eql('missing attribute');
        });

      });

      context('not logged in', function () {
        it('errors 403', async function () {
          const [tag] = dbData.tags;
          const response = await agent
            .post(`/users/${loggedUser.username}/tags`)
            .send({
              data: {
                type: 'user-tags',
                attributes: {
                  story: 'a new testing story',
                  relevance: 3
                },
                relationships: {
                  tag: {
                    data: {
                      type: 'tags',
                      id: tag.tagname
                    }
                  }
                }
              }
            })
            .set('Content-Type', 'application/vnd.api+json')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          const output = response.body;
          output.should.have.property('errors');
        });
      });
    });
  });

  describe('/users/:username/tags/:tagname', function () {
    // TODO include tag & user as relationships and included to the response
    describe('GET', function () {
      let loggedUser, taggedUser;

      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 8,
        userTag: [
          [1, 0, 'story'],
          [1, 1, 'story'],
          [1, 3, 'a story of relationship of taggedUser to relation3', 2],
          [1, 4, 'story'],
          [1, 5, 'story']
        ]
      });

      beforeEach(function () {
        [loggedUser, taggedUser] = dbData.users;
      });

      it('show tag with user\'s story to it', async function () {
        const userTag = dbData.userTag[2];

        const response = await agent
          .get(`/users/${taggedUser.username}/tags/${userTag.tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(loggedUser.username, loggedUser.password)
          .expect(200)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        const respUserTag = response.body;
        respUserTag.should.have.property('data');
        respUserTag.should.have.property('links');

        const data = respUserTag.data;
        const links = respUserTag.links;

        data.should.have.property('type', 'user-tags');
        data.should.have.property('id',
          `${taggedUser.username}--${userTag.tag.tagname}`);

        links.should.have.property('self', `${config.url.all}/users/${userTag.user.username}/tags/${userTag.tag.tagname}`);

        should(data).have.property('attributes');
        const attributes = data.attributes;
        should(attributes).have.property('story', userTag.story);
        should(attributes).have.property('relevance', userTag.relevance);
        should(attributes).have.property('username', userTag.user.username);
        should(attributes).have.property('tagname', userTag.tag.tagname);
      });
    });

    describe('PATCH', function () {

      beforeEachPopulate({
        users: 2, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 1,
        userTag: [
          [0, 0, 'story', 3],
        ]
      });

      context('logged', function () {
        context('valid data', function () {
          it('[story] update user\'s story of a tag', async function () {
            const [userTag] = dbData.userTag;
            const { tag } = userTag;
            const [me] = dbData.users;

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${me.username}--${tag.tagname}`,
                attributes: {
                  story: 'a new story'
                }
              }
            };

            const response = await agent
              .patch(`/users/${me.username}/tags/${tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            const respUserTag = response.body;

            should(respUserTag).have.propertyByPath('data', 'attributes', 'story').equal('a new story');

            const userTagDb = await models.userTag.read(me.username, tag.tagname);
            should(userTagDb).have.property('story', 'a new story');
          });

          it('[relevance] update relevance of the tag for user', async function () {
            const [me] = dbData.users;
            const [userTag] = dbData.userTag;

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${me.username}--${userTag.tag.tagname}`,
                attributes: {
                  relevance: 2
                }
              }
            };

            const response = await agent
              .patch(`/users/${me.username}/tags/${userTag.tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(200)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            const respUserTag = response.body;

            should(respUserTag).have.propertyByPath('data', 'attributes', 'relevance').equal(2);

            const userTagDb = await models.userTag.read(me.username,
              userTag.tag.tagname);
            should(userTagDb).have.property('relevance', 2);
          });
        });

        context('invalid data', function () {
          it('[i\'m not the user of user-tag] 403 and message', async function () {
            const [other, me] = dbData.users;
            const [userTag] = dbData.userTag;

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${other.username}--${userTag.tag.tagname}`,
                attributes: {
                  story: 'a new story',
                  relevance: 3
                }
              }
            };

            await agent
              .patch(`/users/${other.username}/tags/${userTag.tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(403)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[JSON API id doesn\'t match url] 400 and msg', async function () {
            const [me, other] = dbData.users;
            const [userTag] = dbData.userTag;

            const patchData = {
              data: {
                type: 'user-tags',
                // the mismatch
                id: `${other.username}--${userTag.tag.tagname}`,
                attributes: {
                  story: 'a new story',
                  relevance: 3
                }
              }
            };

            const response = await agent
              // compare with the mismatch
              .patch(`/users/${me.username}/tags/${userTag.tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.propertyByPath('errors', 0, 'meta')
              .eql('url should match body id');
          });

          it('[invalid story] 400 and msg', async function () {
            const { userTag: [userTag], users: [me] } = dbData;

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${me.username}--${userTag.tag.tagname}`,
                attributes: {
                  // the too long story
                  story: '.'.repeat(1025)
                }
              }
            };

            const response = await agent
              .patch(`/users/${me.username}/tags/${userTag.tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.propertyByPath('errors', 0, 'meta')
              .eql('userTag story can be at most 1024 characters long');
          });

          it('[invalid relevance] 400 and msg', async function () {
            const { users: [me], userTag: [userTag]} = dbData;

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${me.username}--${userTag.tag.tagname}`,
                attributes: {
                  // invalid relevance
                  relevance: 3.5
                }
              }
            };

            const response = await agent
              .patch(`/users/${me.username}/tags/${userTag.tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.propertyByPath('errors', 0, 'meta')
              .eql('relevance should be a number 1, 2, 3, 4 or 5');

          });

          it('[invalid tagname] 400 and msg', async function () {
            const { users: [me] } = dbData;

            const invalidTagname = 'invalid.tagname';

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${me.username}--${invalidTagname}`,
                attributes: {
                  relevance: 3
                }
              }
            };

            const response = await agent
              .patch(`/users/${me.username}/tags/${invalidTagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.propertyByPath('errors', 0, 'meta')
              .match(/Invalid Tagname/);

          });

          it('[user-tag doesn\'t exist] 404 and msg', async function () {
            const [userTag] = dbData.userTag;
            const { tag } = userTag;
            // the user 1 has no tags
            const [, me] = dbData.users;

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${me.username}--${tag.tagname}`,
                attributes: {
                  story: 'a new story'
                }
              }
            };

            await agent
              .patch(`/users/${me.username}/tags/${tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

          it('[invalid attributes in userTag body] 400', async function () {
            const [userTag] = dbData.userTag;
            const { tag } = userTag;
            // the user 1 has no tags
            const [me] = dbData.users;

            const patchData = {
              data: {
                type: 'user-tags',
                id: `${me.username}--${tag.tagname}`,
                attributes: {
                  story: 'a new story',
                  invalid: 'some invalid attribute'
                }
              }
            };

            const response = await agent
              .patch(`/users/${me.username}/tags/${tag.tagname}`)
              .send(patchData)
              .set('Content-Type', 'application/vnd.api+json')
              .auth(me.username, me.password)
              .expect(400)
              .expect('Content-Type', /^application\/vnd\.api\+json/);

            should(response.body).have.propertyByPath('errors', 0, 'meta')
              .eql('invalid attributes: invalid');

          });
        });
      });

      context('not logged', function () {
        it('403', async function () {
          const [userTag] = dbData.userTag;
          const { tag } = userTag;
          const [me] = dbData.users;

          const patchData = {
            data: {
              type: 'user-tags',
              id: `${me.username}--${tag.tagname}`,
              attributes: {
                story: 'a new story'
              }
            }
          };

          await agent
            .patch(`/users/${me.username}/tags/${tag.tagname}`)
            .send(patchData)
            .set('Content-Type', 'application/vnd.api+json')
            .expect(403)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });
      });

    });

    describe('DELETE', function () {

      beforeEachPopulate({
        users: 3, // how many users to make
        verifiedUsers: [0, 1], // which  users to make verified
        tags: 8,
        userTag: [
          [1, 0, 'story'],
          [1, 1, 'story'],
          [0, 3, 'a story of relationship of taggedUser to relation3'],
          [1, 4, 'story'],
          [1, 5, 'story']
        ]
      });

      it('[user has tag] delete tag from user, respond with 204', async function () {
        const userTag = dbData.userTag[2];
        const user = userTag.user;
        const tag = userTag.tag;

        const response = await agent
          .delete(`/users/${user.username}/tags/${tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(user.username, user.password)
          .expect(204)
          .expect('Content-Type', /^application\/vnd\.api\+json/);

        should(Boolean(response.body)).equal(false);

        const userTagExists = await models.userTag.exists(user.username, tag.tagname);
        (userTagExists).should.equal(false);
      });

      it('[user doesn\'t have the tag] fail with 404', async function () {
        const user = dbData.users[0];
        const tag = dbData.tags[0];
        await agent
          .delete(`/users/${user.username}/tags/${tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(user.username, user.password)
          .expect(404)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

      it('[not me] fail with 403', async function () {
        const userTag = dbData.userTag[2];
        const user = userTag.user;
        const tag = userTag.tag;
        const otherUser = dbData.users[2];

        await agent
          .delete(`/users/${user.username}/tags/${tag.tagname}`)
          .set('Content-Type', 'application/vnd.api+json')
          .auth(otherUser.username, otherUser.password)
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });
    });
  });
});
