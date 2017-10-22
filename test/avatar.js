const crypto = require('crypto'),
      jwt = require('jsonwebtoken'),
      fs = require('fs-extra'),
      path = require('path'),
      supertest = require('supertest'),
      should = require('should'),
      sinon = require('sinon'),
      typeOf = require('image-type'),
      { promisify } = require('util'),
      sizeOf = promisify(require('image-size'));

const app = require(path.resolve('./app')),
      dbHandle = require(path.resolve('./test/handleDatabase')),
      jwtConfig = require(path.resolve('./config/secret/jwt-config')),
      models = require(path.resolve('./models')),
      { clearTemporary } = require(path.resolve('./jobs/files'));

const agent = supertest.agent(app);

describe('/users/:username/avatar', function () {

  let dbData;
  let sandbox;

  // creating sinon sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    // stub jwtSecret
    sandbox.stub(jwtConfig, 'jwtSecret').returns('pass1234');
  });

  afterEach(() => {
    sandbox.restore();
  });

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

  // clear ./uploads/ folder
  afterEach(async () => {
    const uploadsPath = path.resolve('./uploads');
    await fs.remove(uploadsPath);
    await fs.mkdir(uploadsPath);

    should(await fs.readdir(uploadsPath)).Array().length(0);
  });

  // clear ./files/avatars/
  afterEach(async () => {
    const avatarsPath = path.resolve('./files/avatars');
    await fs.remove(avatarsPath);
    await fs.mkdir(avatarsPath);

    should(await fs.readdir(avatarsPath)).Array().length(0);
  });

  let loggedUser, otherUser, loggedUserToken;

  beforeEachPopulate({
    users: 2, // how many users to make
    verifiedUsers: [0, 1] // which  users to make verified
  });

  beforeEach(function () {
    [loggedUser, otherUser] = dbData.users;
    const jwtPayload = {username: loggedUser.username, verified:loggedUser.verified, givenName:'', familyName:''};
    loggedUserToken = jwt.sign(jwtPayload, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
  });

  describe('GET', function () {

    context('logged', function () {

      context('valid data', () => {

        context(':username exists', function () {

          // parse binary html response to buffer
          function binaryParser(res, callback) {
            res.setEncoding('binary');
            res.data = '';
            res.on('data', function (chunk) {
              res.data += chunk;
            });
            res.on('end', function () {
              callback(null, new Buffer(res.data, 'binary'));
            });
          }

          it('[nothing uploaded] responds with 200 and a default svg identicon (identicon.js)', async function () {

            const response = await agent
              .get(`/users/${otherUser.username}/avatar`)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Bearer ' + loggedUserToken)
              .buffer()
              .parse(binaryParser)
              .expect(200)
              .expect('Content-Type', /^image\/svg\+xml/);

            const data = response.body.toString('base64');
            const hash = crypto.createHash('sha256').update(data).digest('hex');
            should(hash).eql('42ddb19216529586c520c7b42e2c4c2dfc68e82a2c1602391bd43be728c94758');

          });

          it('[image uploaded] responds with 200 and a jpeg image', async () => {
            const dest = path.resolve(`./files/avatars/${otherUser.username}/512`);
            const src = path.resolve('./test/img/avatar/512');

            await fs.copy(src, dest);

            const response = await agent
              .get(`/users/${otherUser.username}/avatar?filter[size]=512`)
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Bearer ' + loggedUserToken)
              .buffer()
              .parse(binaryParser)
              .expect(200)
              .expect('Content-Type', /^image\/jpeg/);

            const data = response.body.toString('base64');
            const hash = crypto.createHash('sha256').update(data).digest('hex');
            should(hash).eql('59693cafa42e530693e9c8c0bf2ff2adcc15a4ef2a1e33d8264a87f45d35484b');

          });

        });

        context(':username doesn\'t exist', function () {

          it('responds with 404', async function () {
            await agent
              .get('/users/nonexistent-user/avatar')
              .set('Content-Type', 'application/vnd.api+json')
              .set('Authorization', 'Bearer ' + loggedUserToken)
              .expect(404)
              .expect('Content-Type', /^application\/vnd\.api\+json/);
          });

        });

      });

      context('invalid data', function () {

        it('[invalid size] 400', async function () {
          await agent
            .get(`/users/${otherUser.username}/avatar?filter[size]=511`)
            .set('Content-Type', 'application/vnd.api+json')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[unexpected parameters] 400', async function () {
          await agent
            .get(`/users/${otherUser.username}/avatar?page[limit]=5`)
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

        it('[invalid username] 400', async function () {
          await agent
            .get('/users/invalid--username/avatar')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .expect(400)
            .expect('Content-Type', /^application\/vnd\.api\+json/);
        });

      });

      context('server errors', () => {
        it('[models.user.exists throws an error] should error gracefully', async () => {
          // make the models.user.exists throw
          sandbox.stub(models.user, 'exists').callsFake(async () => {
            throw new Error('failed');
          });
          // don't log error to test console
          sandbox.stub(console, 'error');

          const response = await agent
            .get(`/users/${otherUser.username}/avatar`)
            .set('Content-Type', 'application/vnd.api+json')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .expect(500);

          should(response.body).have.propertyByPath('errors', 0, 'message').eql('failed');
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

        it('[png] responds with 204 and saves the image as jpg', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.png')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          // check images' existence
          const expectedSizes = [16, 32, 64, 128, 256, 512];
          const imagePromises = expectedSizes.map(size => fs.stat(path.resolve(`./files/avatars/${loggedUser.username}/${size}`)));

          await Promise.all(imagePromises);

          const buffer512 = await fs.readFile(path.resolve(`./files/avatars/${loggedUser.username}/512`));
          should(typeOf(buffer512)).deepEqual({ ext: 'jpg', mime: 'image/jpeg' });
        });

        it('[jpeg] responds with 204 and saves the image', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.jpg')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          // check images' existence
          const expectedSizes = [16, 32, 64, 128, 256, 512];
          const imagePromises = expectedSizes.map(size => fs.stat(path.resolve(`./files/avatars/${loggedUser.username}/${size}`)));

          await Promise.all(imagePromises);
        });

        it('delete the temporary file from ./uploads', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.jpg')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          const files = await fs.readdir(path.resolve('./uploads'));
          should(files).Array().length(0);

        });

        it('crops and resizes the image to square 512x512px before saving', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.jpg')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          const { width, height } = await sizeOf(path.resolve(`./files/avatars/${loggedUser.username}/512`));
          should(width).eql(512);
          should(height).eql(512);
        });
      });

      context('bad data', function () {

        it('[unsupported mime type] 400', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/bad-avatar.jpg')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(400);
        });

        it('[too large image (over 2MB)] 400', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/large-avatar.jpg')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(400);
        });

        it('deletes the temporary file from ./uploads', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/bad-avatar.jpg')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(400);

          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/large-avatar.jpg')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(400);

          const files = await fs.readdir(path.resolve('./uploads'));
          should(files).Array().length(0);
        });

      });

      context('server errors', () => {
        it('[missing uploaded temporary file] handle the error gracefully', async () => {
          // fail reading the file
          sandbox.stub(fs, 'readFile').callsFake(async () => {
            const err = new Error('failed');
            err.code = 'ENOENT';
            throw err;
          });
          // don't log error from default error handler
          sandbox.stub(console, 'error');

          const response = await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.png')
            .set('Authorization', 'Bearer ' + loggedUserToken)
            .set('Content-Type', 'image/jpeg')
            .expect(500);

          should(response.body).have.propertyByPath('errors', 0, 'message').eql('The image upload failed. Try again.');
        });
      });
    });

    context('not logged as :username', function () {

      it('responds with 403', async () => {
        await agent
          .patch(`/users/${otherUser.username}/avatar`)
          .attach('avatar', './test/img/avatar.jpg')
          .set('Authorization', 'Bearer ' + loggedUserToken)
          .set('Content-Type', 'image/jpeg')
          .expect(403);
      });

    });

    describe('job: regularly clear stale temporary upload files', () => {
      it('should leave the /uploads folder empty', async () => {
        const uploads = path.resolve('./uploads');

        // first there should be some files
        const filePromises = [0, 1, 2, 3, 4].map(async name => fs.close(await fs.open(path.resolve(`./uploads/${name}`), 'w')));
        await Promise.all(filePromises);

        const files = await fs.readdir(uploads);
        should(files).Array().length(5);

        // then we run the job
        await clearTemporary();

        // then there should be no files
        const filesAfter = await fs.readdir(uploads);
        should(filesAfter).Array().length(0);
      });

      it('should leave the files less than 1 minute old');
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
