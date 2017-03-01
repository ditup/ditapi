const supertest = require('supertest'),
      should = require('should'),
      crypto = require('crypto'),
      path = require('path');

const app = require(path.resolve('./app')),
      dbHandle = require(path.resolve('./test/handleDatabase'));

const agent = supertest.agent(app);

describe('/users/:username/avatar', function () {

  let dbData;

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

  let loggedUser, otherUser;

  beforeEachPopulate({
    users: 2, // how many users to make
    verifiedUsers: [0, 1] // which  users to make verified
  });

  beforeEach(function () {
    [loggedUser, otherUser] = dbData.users;
  });

  describe('GET', function () {

    context('logged', function () {

      context(':username exists', function () {

        it('[nothing uploaded] responds with 200 and a default identicon (identicon.js)', async function () {
          const response = await agent
            .get(`/users/${otherUser.username}/avatar`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(200)
            .expect('Content-Type', /^application\/vnd\.api\+json/);

          // the request returns a json:
          // {
          //    data: {
          //      type: 'user-avatars'
          //      id: username
          //      attributes: {
          //        format,
          //        base64
          //      }
          //    }
          // }
          // check the proper format attribute

          should(response).have.propertyByPath('body', 'data', 'type').eql('user-avatars');
          should(response).have.propertyByPath('body', 'data', 'id').eql('user1');
          should(response).have.propertyByPath('body', 'data', 'attributes', 'format').eql('png');
          should(response).have.propertyByPath('body', 'data', 'attributes', 'base64');

          // compare hash of the base64 image representation
          const data = response.body.data.attributes.base64;
          const hash = crypto.createHash('sha256').update(data).digest('hex');

          should(hash).equal('e4bc10f78c8e645c9fe170c46534e3593f8230cb295f283c0ad2846b64914f12');

        });

        it('[png uploaded] responds with 200 and a png image');

        it('[jpeg uploaded] responds with 200 and a jpeg image');

      });

      context(':username doesn\'t exist', function () {

        it('responds with 404', async function () {
          await agent
            .get('/users/nonexistent-user/avatar')
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
            .expect(404)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

      });
    });

    context('not logged', function () {

      it('responds with 403', async function () {
        await agent
          .get('/users/nonexistent-user/avatar')
          .set('Content-Type', 'application/vnd.api+json')
          .expect(403)
          .expect('Content-Type', /^application\/vnd\.api\+json/);
      });

    });
  });

  describe('PATCH', function () {

    context('logged as :username', function () {

      context('good data type (png, jpeg)', function () {

        it('[png] responds with 200 and saves the image');

        it('[jpeg] responds with 200 and saves the image');

        it('crops and resizes the image to square 512x512px before saving');

        it('gets rid of any previous avatar of the user');

      });

      context('bad data type', function () {

        it('responds with 400 bad data');

      });
    });

    context('not logged as :username', function () {

      it('responds with 403');

    });

  });

  describe('DELETE', function () {

    context('logged as :username', function () {

      it('[data on server] responds with 204 and deletes the avatar from server');

      it('[no user image] responds with 204');

    });

    context('not logged as :username', function () {

      it('responds with 403');

    });

  });
});
