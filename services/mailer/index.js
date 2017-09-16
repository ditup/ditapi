'use strict';

const path = require('path'),
      nodemailer = require('nodemailer'),
      EmailTemplate = require('email-templates').EmailTemplate,
      fs = require('fs-extra'),
      markdown = require('helper-markdown'),
      hbs = require('handlebars');

const config = require(path.resolve('./config'));

const dataNotProvided = new Error('data not provided');

// register handlebars partials and helpers
(function () {

  // definite partials and helpers
  hbs.registerHelper('html-partial', name => `${name}-html`);
  hbs.registerHelper('text-partial', name => `${name}-text`);
  hbs.registerHelper('markdown', markdown());

  // configurable partials
  const partialNames = [
    'reset-password',
    'verify-email',
    'notify-contact-request',
    'notify-messages'
  ];

  partialNames.forEach(name => registerPartial(name));

  function registerPartial(name) {
    // do this on startup, therefore synchronously

    // read the partials from files
    const partialHtml = fs.readFileSync(path.join(__dirname, 'templates', name, 'html.hbs'));
    const partialText = fs.readFileSync(path.join(__dirname, 'templates', name, 'text.hbs'));
    // register
    hbs.registerPartial(`${name}-html`, partialHtml.toString());
    hbs.registerPartial(`${name}-text`, partialText.toString());
  }

}());


async function sendMail(type, params, email, subject) {
  const template = new EmailTemplate(path.join(__dirname, 'templates', 'main'));
  const { html, text } = await template.render({ type, params });

  const toSend = { to: `<${email}>`, subject, html, text };

  return await exports.general(toSend);

}

exports.general = async function ({ to, from='info@ditup.org <info@ditup.org>', subject, html, text }) {
  let transporter;
  try {
    if(!to) throw dataNotProvided;

    transporter = nodemailer.createTransport(config.mailer);

    const emailOptions = { from, to, subject, html, text };

    const info = await new Promise(function (resolve, reject) {
      transporter.sendMail(emailOptions, function (err, response) {
        if(err) return reject(err);
        return resolve(response);
      });
    });

    return info;
  } finally {
    transporter.close();
  }
};

exports.notifyMessages = async function ({ messages, from, to }) {
  const hasParameters = Boolean(messages && from && from.username && to && to.email);
  if(!hasParameters) throw dataNotProvided;

  const url = `${config.appUrl.all}/messages/${from.username}`;

  const isMore = messages.length > 1;

  const { email } = to;
  const subject = `${from.username} sent you a new message on ditup`;

  return await sendMail('notify-messages', { from, to, messages, url, isMore }, email, subject);
};

exports.notifyContactRequest = async function ({ from, to, message }) {
  const hasParameters = Boolean(from && from.username && to && to.email, message);
  if(!hasParameters) throw dataNotProvided;

  const url = `${config.appUrl.all}/user/${to.username}/contact/${from.username}`;
  const subject = `${from.username} would like to create a contact with you on ditup`;

  return await sendMail('notify-contact-request', { from, to, url, message }, to.email, subject);
};

exports.verifyEmail = async function ({ email, url, username, code }) {
  const hasParameters = Boolean(email && url && username && code);
  if(!hasParameters) throw dataNotProvided;

  const subject =  'email verification for ditup.org';
  return await sendMail('verify-email', { username, url, code }, email, subject);
};

exports.resetPassword = async function ({ username, email, url }) {
  const hasParameters = Boolean(email && url && username);
  if(!hasParameters) throw dataNotProvided;

  const subject = 'reset your password for ditup';
  return await sendMail('reset-password', { username, url }, email, subject);
};
