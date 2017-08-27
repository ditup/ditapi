const supertest = require('supertest'),
      should = require('should'),
      fs = require('fs-extra'),
      crypto = require('crypto'),
      { promisify } = require('util'),
      path = require('path'),
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

  let loggedUser, otherUser;

  beforeEachPopulate({
    users: 2, // how many users to make
    verifiedUsers: [0, 1] // which  users to make verified
  });

  beforeEach(function () {
    [loggedUser, otherUser] = dbData.users;
  });

  describe('create default image identicon on email confirmation', () => {
    it('create the svg image');
  });

  describe('GET', function () {

    context('logged', function () {

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
            .auth(loggedUser.username, loggedUser.password)
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
            .get(`/users/${otherUser.username}/avatar`)
            .set('Content-Type', 'application/vnd.api+json')
            .auth(loggedUser.username, loggedUser.password)
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

        it('[png] responds with 204 and saves the image as jpg', async () => {
          await agent
            .patch(`/users/${loggedUser.username}/avatar`)
            .attach('avatar', './test/img/avatar.png')
            .auth(loggedUser.username, loggedUser.password)
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
            .auth(loggedUser.username, loggedUser.password)
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
            .auth(loggedUser.username, loggedUser.password)
            .set('Content-Type', 'image/jpeg')
            .expect(204);

          const files = await fs.readdir(path.resolve('./uploads'));
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

          const files = await fs.readdir(path.resolve('./uploads'));
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
