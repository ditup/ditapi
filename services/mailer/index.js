'use strict';

var path = require('path'),
    co = require('co'),
    nodemailer = require('nodemailer'),
    smtpTransport = require('nodemailer-smtp-transport'),
    EmailTemplate = require('email-templates').EmailTemplate;

var config = require(path.resolve('./config'));

var dataNotProvided = new Error('data not provided');

exports.general = function ({ to: email, from: from, subject: subject, html: html, text: text }) {
  return co(function * () {
    if(!email) throw dataNotProvided;

    var transport = nodemailer.createTransport(smtpTransport(config.mailer));

    var emailOptions = {
      from: from ? `<${from}>` : 'info@ditup.org <info@ditup.org>',
      to: `<${email}>`,
      subject: subject,
      html: html,
      text: text
    };

    var info = yield new Promise(function (resolve, reject) {
      transport.sendMail(emailOptions, function (err, response) {
        if(err) return reject(err);
        return resolve(response);
      })
    });

    transport.close();
    return info;
  
  }).catch(function (err) {
    transport.close();
    throw err;
  });

};

exports.verifyEmail = function ({email: email, url: url, username: username}) {
  return co.call(this, function * () {
    let hasParameters = Boolean(email && url && username);
    if(!hasParameters) throw dataNotProvided;

    let verify =
      new EmailTemplate(path.join(__dirname, 'templates', 'verify-email'));

    let result = yield verify.render({ username: username, url: url });

    var toSend = {
      to: email,
      subject: 'email verification for ditup.org',
      html: result.html,
      text: result.text
    };

    return this.general(toSend);
  });
};

exports.resetPassword = function (data) {
  var data = data || {};
  data.email = data.to || data.email;
  if(!data.email || !data.url || !data.username) return Q.reject(dataNotProvided);

  var that = this;

  var templateDir = path.join(__dirname, 'templates', 'reset-password');

  var rep = new EmailTemplate(templateDir);
  //var qvr = Q.denodeify(verify.render);

  var renderData = { username: data.username, url: data.url };
  return rep.render(renderData)
    .then(function (result) {
      var toSend = {
        to: data.email,
        subject: 'password reset for ditup.org',
        html: result.html,
        text: result.text
      };

      return that.general(toSend);
    });
};
