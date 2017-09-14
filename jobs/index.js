'use strict';

/*
 * Here we define regular jobs
 * i.e. to keep the system clean
 *
 */

const cron = require('node-cron'),
      files = require('./files'),
      tags = require('./tags'),
      users = require('./users'),
      notifications = require('./notifications');

const tasks = [];

// start all the tasks
exports.start = function () {
  // every day at 4 am delete all abandoned tags
  tasks.push(cron.schedule('0 0 4 * * *', tags.deleteAbandoned));

  // every day at 3 am delete everything in ./uploads
  // TODO only older than 1 minute
  tasks.push(cron.schedule('0 0 3 * * *', files.clearTemporary));

  // every 5 minutes send notifications about unread messages
  tasks.push(cron.schedule('0 */5 * * * *', notifications.messages));

  // every 2 minutes send notifications about contact requests
  tasks.push(cron.schedule('0 */2 * * * *', notifications.contactRequests));

  // every 30 minutes delete unverified users
  tasks.push(cron.schedule('0 */30 * * * *', users.deleteUnverified));
};

exports.stop = function () {
  tasks.forEach(task => { task.destroy(); });
};
