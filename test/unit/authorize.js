'use strict';

const path = require('path');
const httpMocks = require('node-mocks-http'),
      jwt = require('jsonwebtoken'),
      should = require('should'),
      sinon = require('sinon'),
      rewire = require('rewire');


// const models = require(path.resolve('./models'));
// const authController = require(path.resolve('./controllers/authenticate-token'));
const authorizeController = rewire(path.resolve('./controllers/authorize'));
const jwtConfig = require(path.resolve('./config/secret/jwt-config'));
const authorizeControllerPublic = require(path.resolve('./controllers/authorize'));


describe.only('token authorization', function() {
  let sandbox;
  const user = { username: 'user',
    password: 'userPass'};
  const userToken = jwt.sign({username: user.username}, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
  //    const forAuthBuffer = new Buffer(user.username+':'+user.password).toString('base64');
  //    const userBasicAuth = "Basic " + forAuthBuffer;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });
  describe.only('tokenGetData(token)', function() {
    const tokenGetData = authorizeController.__get__('tokenGetData');
    describe('correct token', function() {
      it('should return true', async function(){
        const check = await tokenGetData(userToken);
        should(check.valid).equal(true);
      });
      it('should return correct username', async function(){
        const check = await tokenGetData(userToken);
        should(check.data.username).equal(user.username);
      });
      it('should call token.verify once', async function(){
        const stubToken = sandbox.stub(jwt, 'verify');
        await tokenGetData(userToken);
        should(stubToken.callCount).equal(1);
      });
    });
    describe('incorrect token', function(){
      it('should return false', async function(){
        const check = await tokenGetData(userToken+'x');
        should(check.valid).equal(false);
      });
      it('should return empty data field', async function(){
        const check = await tokenGetData(userToken+'x');
        should(check.data).be.empty;
      });
      it('should call token.verify once', async function(){
        const stubToken = sandbox.stub(jwt, 'verify');
        await tokenGetData(userToken+'x');
        should(stubToken.callCount).equal(1);
      });
    });
  });
  describe.only('onlyLogged(req, res, next)', function(){
    // const tokenGetData = authorizeController.__get__('tokenGetData');
    describe('sending request with correct authorization header', function(){
      it('should call next()', async function() {
        // spying on next(); by sending spy of next to middleware
        const req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}});
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,{},nextSpy);
        should(nextSpy.callCount).equal(1);
      });
      it('should call token.getData() once', async function() {
        // mocking request
        const req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}});
        // set stubing by function returning valid:true
        const tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        const unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
        await authorizeController.onlyLogged(req,{},()=>true);
        should(tokenStub.callCount).equal(1);
        // rewerts change
        unset();
      });
    });
    describe('sending request with incorrect authorization header', function(){
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        const req = httpMocks.createRequest({headers: {authorization: 'incorrectheader'}});
        const res = httpMocks.createResponse();
        await authorizeControllerPublic.onlyLogged(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should call token.getData() once', async function() {
        // mocking request
        const req = httpMocks.createRequest({headers: {authorization: 'incorrectheader'}});
        // set stubing by function returning valid:true
        const tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        const unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
        await authorizeController.onlyLogged(req,{},()=>true);
        should(tokenStub.callCount).equal(1);
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        const req = httpMocks.createRequest({headers: {authorization: 'incorectheader'}});
        const res = httpMocks.createResponse();
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
    });
    describe('sending request without authorization header', function(){
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        const req = httpMocks.createRequest({headers: {}});
        const res = httpMocks.createResponse();
        await authorizeControllerPublic.onlyLogged(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should not call token.getData()', async function() {
        // mocking request
        const req = httpMocks.createRequest({headers: {}});
        const res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        const tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        const unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
        await authorizeController.onlyLogged(req,res,()=>true);
        should(tokenStub.callCount).equal(0);
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        const req = httpMocks.createRequest({headers: {}});
        const res = httpMocks.createResponse();
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLogged(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
    });
  });
  describe.only('onlyLoggedMe(req, res, next)', function(){
    // const tokenGetData = authorizeController.__get__('tokenGetData');
    describe('sending request with correct authorization header', function(){
      it('should call next()', async function() {
        // spying on next(); by sending spy of next to middleware
        const req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(1);
      });
      it('should call token.getData() once', async function() {
        // mocking request
        const req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        const tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        const unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
        // rewerts change
        unset();
      });
    });
    describe('sending request with incorrect authorization header', function(){
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        const req = httpMocks.createRequest({headers: {authorization: 'incorrectheader'}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should call token.getData() once', async function() {
        // mocking request
        const req = httpMocks.createRequest({headers: {authorization: 'incorrectheader'}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        const tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        const unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(1);
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        const req = httpMocks.createRequest({headers: {authorization: 'incorectheader'}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
    });
    describe('sending request without authorization header', function(){
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        const req = httpMocks.createRequest({headers: {}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should not call token.getData()', async function() {
        // mocking request
        const req = httpMocks.createRequest({headers: {}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        // set stubing by function returning valid:true
        const tokenStub = sandbox.stub().callsFake(()=>({valid:true}));
        // mocks tokenGetData to call tokenStub (mocking with rewire) (returns function to invert mocking)
        const unset = authorizeController.__set__('tokenGetData', tokenStub);
        // passing empty res and next() returning true
        await authorizeController.onlyLoggedMe(req,res,()=>true);
        should(tokenStub.callCount).equal(0);
        // rewerts change
        unset();
      });
      it('should not call next()', async function() {
        const req = httpMocks.createRequest({headers: {}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
    });

    describe('sending request without params.username', function(){
      it('should return res with 403 status', async function() {
        // spying on next(); by sending spy of next to middleware
        const req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}});
        const res = httpMocks.createResponse();
        await authorizeControllerPublic.onlyLoggedMe(req,res,()=>true);
        should(res.statusCode).equal(403);
      });
      it('should not call next', async function() {
        const req = httpMocks.createRequest({headers: {authorization: 'Bearer ' + userToken}});
        const res = httpMocks.createResponse();
        const nextSpy = sandbox.spy();
        await authorizeControllerPublic.onlyLoggedMe(req,res,nextSpy);
        should(nextSpy.callCount).equal(0);
      });
    });
    describe('sending corect request and not getting data.username from token', function(){
      it('should return res with 403 status', async function() {
        // mocking request
        const req = httpMocks.createRequest({headers: {}, params:{username: user.username}});
        const res = httpMocks.createResponse();
        // set stubing by function returning valid:true and no data
        await authorizeController.onlyLoggedMe(req,res,()=>{});
        should(res.statusCode).equal(403);
      });
    });
  });
});