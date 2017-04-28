'use strict';

const path = require('path'),
      nodemailer = require('nodemailer'),
      smtpTransport = require('nodemailer-smtp-transport'),
      EmailTemplate = require('email-templates').EmailTemplate;

const config = require(path.resolve('./config'));

const dataNotProvided = new Error('data not provided');

exports.general = async function ({ email, from, subject, html, text }) {
  let transport;
  try {
    if(!email) throw dataNotProvided;

    transport = nodemailer.createTransport(smtpTransport(config.mailer));

    const emailOptions = {
      from: from ? `<${from}>` : 'info@ditup.org <info@ditup.org>',
      to: `<${email}>`,
      subject: subject,
      html: html,
      text: text
    };

    const info = await new Promise(function (resolve, reject) {
      transport.sendMail(emailOptions, function (err, response) {
        if(err) return reject(err);
        return resolve(response);
      });
    });

    transport.close();
    return info;

  } catch (e) {
    /* handle error */
    transport.close();
    throw e;
  }
};

exports.notifyMessages = async function ({ messages, from, to }) {
  const hasParameters = Boolean(messages && from && from.username && to && to.email);
  if(!hasParameters) throw dataNotProvided;

  const template = new EmailTemplate(path.join(__dirname, 'templates', 'notify-messages'));

  const url = `${config.appUrl.all}/messages/${from.username}`;

  const { html, text } = await template.render({ from, to, messages, url });

  const toSend = {
    email: to.email,
    subject: `${from.username} sent you a new message on ditup`,
    html,
    text
  };

  return await this.general(toSend);
};

exports.verifyEmail = async function ({ email, url, username, code }) {
  const hasParameters = Boolean(email && url && username);
  if(!hasParameters) throw dataNotProvided;

  const verify = new EmailTemplate(path.join(__dirname, 'templates', 'verify-email'));

  const { html, text } = await verify.render({ username, url, code });

  const toSend = {
    email,
    subject: 'email verification for ditup.org',
    html,
    text
  };

  return await this.general(toSend);
};

/*
exports.resetPassword = function (data) {
  data = data || {};
  data.email = data.to || data.email;
  if(!data.email || !data.url || !data.username) return Promise.reject(dataNotProvided);

  var that = this;

  var templateDir = path.join(__dirname, 'templates', 'reset-password');

  var rep = new EmailTemplate(templateDir);

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
*/
