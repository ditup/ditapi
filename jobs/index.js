'use strict';

/*
 * Here we define regular jobs
 * i.e. to keep the system clean
 *
 */

const cron = require('node-cron'),
      _ = require('lodash'),
      tags = require('./tags');

const tasks = [];

// start all the tasks
exports.start = function () {
  // every day at 4 am delete all abandoned tags
  tasks.push(cron.schedule('0 0 4 * * *', tags.deleteAbandoned));
};

exports.stop = function () {
  _.each(tasks, task => { task.destroy(); });
};
