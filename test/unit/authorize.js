'use strict';

const path = require('path');
const httpMocks = require('node-mocks-http'),
	  jwt = require('jsonwebtoken'),
	  should = require('should'),
	  sinon = require('sinon'),
	  rewire = require('rewire');


//const models = require(path.resolve('./models'));
//const authController = require(path.resolve('./controllers/authenticate-token'));
const authorizeController = rewire(path.resolve('./controllers/authorize'));
const jwtConfig = require(path.resolve('./config/secret/jwt-config'));



describe.only('token authorization', function() {
	let sandbox;
	const user = { username: 'user',
					  password: 'userPass'};
	const userToken = jwt.sign({username: user.username}, jwtConfig.jwtSecret, { algorithm: 'HS256', expiresIn: jwtConfig.expirationTime });
//	const forAuthBuffer = new Buffer(user.username+':'+user.password).toString('base64');
//	const userBasicAuth = "Basic " + forAuthBuffer;

	beforeEach(function () {
	    sandbox = sinon.sandbox.create();
	});

	afterEach(function () {
	    sandbox.restore();
	});
	describe.only('tokenGetData(token)', function() {
		const tokenGetData = authorizeController.__get__('tokenGetData')
		describe('correct token', function() {
			it('should return true', async function(){
				const check = await tokenGetData(userToken);
				should(check.valid).equal(true);
			});
			it('should return correct username');
			it('should call token.valid once');
		});
		describe('incorrect token', function(){
			it('should return false');
			it('should return empty data field');
			it('should call token.valid.once');
		});
	});
	describe.only('onlyLoggedMe(req, res, next)', function(){
		console.log('dzik');
	})




});