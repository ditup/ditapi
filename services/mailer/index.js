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

exports.notifyContactRequest = async function ({ from, to, message }) {
  const hasParameters = Boolean(from && from.username && to && to.email, message);
  if(!hasParameters) throw dataNotProvided;

  const template = new EmailTemplate(path.join(__dirname, 'templates', 'notify-contact-request'));

  const url = `${config.appUrl.all}/user/${to.username}/contact/${from.username}`;

  const { html, text } = await template.render({ from, to, url, message });

  const toSend = {
    email: to.email,
    subject: `${from.username} would like to create a contact with you on ditup`,
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

exports.resetPassword = async function ({ username, email, url }) {
  const hasParameters = Boolean(email && url && username);

  if(!hasParameters) throw dataNotProvided;

  const template = new EmailTemplate(path.join(__dirname, 'templates', 'reset-password'));

  const { html, text } = await template.render({ username, url });

  const toSend = {
    email,
    subject: 'reset your password for ditup',
    html,
    text
  };

  return await this.general(toSend);
};
