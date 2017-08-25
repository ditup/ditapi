const supertest = require('supertest'),
      should = require('should'),
      fs = require('fs'),
      crypto = require('crypto'),
      { promisify } = require('util'),
      path = require('path'),
      rimraf = promisify(require('rimraf')),
      sizeOf = promisify(require('image-size')),
      typeOf = require('image-type');

const app = require(path.resolve('./app')),
      dbHandle = require(path.resolve('./test/handleDatabase')),
      { clearTemporary } = require(path.resolve('./jobs/files'));

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

          should(hash).equal('7d76d24aee7faf11a3494ae91b577d94cbb5320cec1b2fd04187fff1197915bb');

        });

        it('[png uploaded] responds with 200 and a jpeg image');

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


    // fs functions changed to promise
    const stat = promisify(fs.stat);
    const readdir = promisify(fs.readdir);
    const unlink = promisify(fs.unlink);
    const readFile = promisify(fs.readFile);
    const fsp = { // fs promisified
      open: promisify(fs.open),
      close: promisify(fs.close)
    };

    // clear ./uploads/ folder
    afterEach(async () => {
      const files = await readdir(path.resolve('./uploads'));
      const filePromises = files.map(file => unlink(path.resolve(`./uploads/${file}`)));
      await Promise.all(filePromises);
      const filesAfter = await readdir(path.resolve('./uploads'));

      // check that the /uploads folder is empty
      should(filesAfter).Array().length(0);
    });

    // clear ./files/avatars/
    afterEach(async () => {

      const avatarsDir = path.resolve('./files/avatars');
      const folders = await readdir(avatarsDir);
      const delPromises = folders.map(folder => rimraf(`./files/avatars/${folder}`));
      await Promise.all(delPromises);

      // check that the /files/avatars folder is empty
      should(await readdir(avatarsDir)).Array().length(0);
    });

    context('logged as :username', function () {

      context('good data type (png, jpeg)', function () {

        it('[png] responds with 204 and saves the image as jpg', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.png')
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          // check images' existence
          const expectedSizes = [16, 32, 64, 128, 256, 512];
          const imagePromises = expectedSizes.map(size => stat(path.resolve(`./files/avatars/${loggedUser.username}/${size}`)));

          await Promise.all(imagePromises);

          const buffer512 = await readFile(path.resolve(`./files/avatars/${loggedUser.username}/512`));
          should(typeOf(buffer512)).deepEqual({ ext: 'jpg', mime: 'image/jpeg' });
        });

        it('[jpeg] responds with 204 and saves the image', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.jpg')
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          // check images' existence
          const expectedSizes = [16, 32, 64, 128, 256, 512];
          const imagePromises = expectedSizes.map(size => stat(path.resolve(`./files/avatars/${loggedUser.username}/${size}`)));

          await Promise.all(imagePromises);
        });

        it('delete the temporary file from ./uploads', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.jpg')
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          const files = await readdir(path.resolve('./uploads'));
          should(files).Array().length(0);

        });

        it('crops and resizes the image to square 512x512px before saving', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.jpg')
            .auth(loggedUser.username, loggedUser.password)
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
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(400);
        });

        it('[too large image (over 2MB)] 400', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/large-avatar.jpg')
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(400);
        });

        it('deletes the temporary file from ./uploads', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/bad-avatar.jpg')
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(400);

          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/large-avatar.jpg')
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(400);

          const files = await readdir(path.resolve('./uploads'));
          should(files).Array().length(0);
        });

      });
    });

    context('not logged as :username', function () {

      it('responds with 403', async () => {
        await agent
          .patch(`/users/${otherUser.username}/avatar`)
          .attach('avatar', './test/img/avatar.jpg')
          .auth(loggedUser.username, loggedUser.password)
          .set('Content-Type', 'image/jpeg')
          .expect(403);
      });

    });

    describe('job: regularly clear all temp files older than 1 minute', () => {
      it('should leave the /uploads folder empty', async () => {
        const uploads = path.resolve('./uploads');

        // first there should be some files
        const filePromises = [0, 1, 2, 3, 4].map(async name => fsp.close(await fsp.open(path.resolve(`./uploads/${name}`), 'w')));
        await Promise.all(filePromises);

        const files = await readdir(uploads);
        should(files).Array().length(5);

        // then we run the job
        await clearTemporary();

        // then there should be no files
        const filesAfter = await readdir(uploads);
        should(filesAfter).Array().length(0);
      });
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
