'use strict';

const path = require('path'),
      models = require(path.resolve('./models')),
      mailer = require(path.resolve('./services/mailer')),
      _ = require('lodash');

/*
 * sends notifications about new (unread, unnotified) messages
 *
 */
async function messages() {
  // get all unread, unnotified messages sorted by their receivers
  const unnotified = await models.message.readUnnotified();

  // send email notifications to the receivers
  for (const { messages, from, to } of unnotified) {
    await mailer.notifyMessages({ messages, from, to });
  }

  // mark the messages as notified
  await models.message.updateNotified(_.map(unnotified, msg => msg.id));
}

exports.messages = messages;
