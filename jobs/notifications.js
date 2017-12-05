'use strict';

const path = require('path'),
      models = require(path.resolve('./models')),
      mailer = require(path.resolve('./services/mailer'));

/*
 * sends notifications about new (unread, unnotified) messages
 *
 */
async function messages() {
  // TODO change to use cursor (not to return too big object from db)

  // get all unread, unnotified messages sorted by their receivers
  const unnotified = await models.message.readUnnotified();

  // send email notifications to the receivers
  for (const { messages, from, to } of unnotified) {
    await mailer.notifyMessages({ messages, from, to });
  }

  // collect ids of the messages
  // first as array of arrays (an array for each direction of each thread);
  const threadIds = unnotified.map(({ messages }) => messages.map(msg => msg._key));
  // and concatenate them to a single array
  const ids = [].concat(...threadIds);

  // mark the messages as notified
  await models.message.updateNotified(ids);
}

async function contactRequests() {
  // get all unnotified unconfirmed contact requests
  // TODO change the database access to cursor instead of returning a big object
  const unnotified = await models.contact.readUnnotified();
  // send a mail to every unnotified contact request
  for (const { from, to, message } of unnotified) {
    await mailer.notifyContactRequest({ from, to, message });
    // and update to notified
    await models.contact.updateNotified(from.username, to.username);

  }
}

exports.messages = messages;
exports.contactRequests = contactRequests;
