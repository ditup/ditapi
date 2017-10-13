'use strict';

const path = require('path');
const httpMocks = require('node-mocks-http'),
      jwt = require('jsonwebtoken'),
      should = require('should'),
      sinon = require('sinon');


const models = require(path.resolve('./models'));
const authController = require(path.resolve('./controllers/authenticate-token'));
const jwtConfig = require(path.resolve('./config/secret/jwt-config'));



describe.only('generateTokenBehavior(req)', function() {
  let sandbox;
  const user = { username: 'user', verified: true, givenName: 'givenNameUser', familyName: 'familyNameUser',
    password: 'userPass'};
  const userToken = jwt.sign({username: user.username, verified: user.verified, givenName: user.givenName, familyName: user.familyName}, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
  const forAuthBuffer = new Buffer(user.username+':'+user.password).toString('base64');
  const userBasicAuth = 'Basic ' + forAuthBuffer;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });
  describe('valid request', function() {
    it('should return 200 given valid username and password', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      // sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).equal(200);
    });
    it('should return object {meta:{token:}} in response data given valid data', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      // sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.data).have.property('token');
    });
    it('should return a correct jwt token',async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.data.token).equal(userToken);
      // TODO mock time
    });
    it('should return status in response data given valid data', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      // sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp).have.property('status');
    });
    it('should return data in response given valid data', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      // sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp).have.property('data');
    });
    it('should return token param given valid data', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.data).have.property('token');
    });
    it('should return 403 given incorrect username and password', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:false, verified:false}));
      // sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).equal(403);
    });
    // TODO unverified
    /* it('should return 403 given invalid username and password', async function() {
            const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
            const username = 'verifiedUser';
            sandbox.stub(models.user, 'exists').callsFake((username) => true);
            sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:false, verified:false}));
            sandbox.stub(jwt, 'sign').callsFake(() => userToken);
            const resp = await authController.generateTokenBehavior(req);
            should(resp.status).equal(403);
        });*/
    it('should return numerical status value given correct username and password', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').returns(true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true, verified:true,givenName:'user', familyName:'user', username:'user'}));
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).be.type('number');
    });
    it('should return numerical status value given incorrect password', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').returns(true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:false, verified:false}));
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).be.type('number');
    });
  });
  describe('called functions throw errors', function() {
    it('should return status 500 when model.user.exists() throws an error ', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => {throw new Error('bad output');});
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).equal(500);
    });
    it('should return status 500 when model.user.authenticate() throws an error ', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => {throw new Error('Database Error');});
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).equal(500);
    });
    it('should return status 500 in response data while having proglem creating token', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      sandbox.stub(jwt, 'sign').callsFake(() => {throw new Error('bad output');});
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).equal(500);
    });
  });

  describe('invalid request', function() {
    it('should return 401 while lack of authorization header in request', async function() {
      const req = httpMocks.createRequest({headers: {}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:'user', familyName:'user', username:'user'}));
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).equal(401);
    });
    it('should return 401 while invalid authorization header in request', async function() {
      const req = httpMocks.createRequest({headers: {authorization: 'invalidHeader'}});
      sandbox.stub(models.user, 'exists').callsFake(() => true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true,givenName:'user', familyName:'user', username:'user'}));
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const resp = await authController.generateTokenBehavior(req);
      should(resp.status).equal(401);
    });
  });



  // with calling jwt.sign
  it('should call jwt.sign with username, verified, algorithm and expiresIn parameters', async function() {
    const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
    sandbox.stub(models.user, 'exists').callsFake(() => true);
    sandbox.stub(models.user, 'authenticate').callsFake(() => ({ authenticated: true,
      verified: true,givenName: 'givenNameUser',
      familyName: 'familyNameUser',
      username: 'user' }
    ));
    const jwtSpy = sandbox.spy(jwt, 'sign');
    await authController.generateTokenBehavior(req);
    const spiedAuth = jwtSpy.calledWith({ username: user.username, verified: user.verified, givenName: user.givenName, familyName: user.familyName },jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
    should(spiedAuth).equal(true);
  });
  it('should call jwt.sign with algorithm: HS256', async function() {
    const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
    sandbox.restore();
    sandbox.stub(models.user, 'exists').callsFake(() => true);
    sandbox.stub(models.user, 'authenticate').callsFake(() => ({ authenticated: true,
      verified: true,givenName: 'givenNameUser',
      familyName: 'familyNameUser',
      username: 'user' }));
    const jwtSpy = sandbox.spy(jwt, 'sign');
    await authController.generateTokenBehavior(req);
    // TODO sinon called with just some of the aruments
    const spiedAuth = jwtSpy.calledWith({ username: user.username, verified: user.verified, givenName: user.givenName, familyName: user.familyName },jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
    should(spiedAuth).equal(true);
  });

  describe('authenticated: true', function(){
    it('should call exists once', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({ authenticated: true,
        verified: true, givenName: 'user', familyName: 'user', username: 'user' }));
      const jwtSpy = sandbox.spy(models.user, 'exists');
      await authController.generateTokenBehavior(req);
      const spiedAuth = jwtSpy.callCount;
      should(spiedAuth).equal(1);
    });
    it('should call authenticate once', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').returns(true);
      sandbox.stub(jwt, 'sign').callsFake(() => userToken);
      const jwtSpy = sandbox.spy(models.user, 'authenticate');
      await authController.generateTokenBehavior(req);
      const spiedAuth = jwtSpy.callCount;
      should(spiedAuth).equal(1);
    });
    it('should call token.sign once', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').returns(true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:true,
        verified: true, givenName:user.givenName, familyName:user.familyName, username:user.username}));
      const jwtSpy = sandbox.spy(jwt, 'sign');
      await authController.generateTokenBehavior(req);
      const spiedAuth = jwtSpy.callCount;
      should(spiedAuth).equal(1);
    });
  });
  describe('authenticated: false', function(){
    it('should not call token.sign', async function() {
      const req = httpMocks.createRequest({headers: {authorization: userBasicAuth}});
      sandbox.stub(models.user, 'exists').returns(true);
      sandbox.stub(models.user, 'authenticate').callsFake(() => ({authenticated:false, verified:false}));
      const jwtSpy = sandbox.spy(jwt, 'sign');
      await authController.generateTokenBehavior(req);
      const spiedAuth = jwtSpy.callCount;
      should(spiedAuth).equal(0);
    });
  });
});