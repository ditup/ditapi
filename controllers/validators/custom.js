'use strict';

// TODO this is likely to be removed or updated in future

const path = require('path');
const models = require(path.resolve('./models'));

exports.isTags = function(value) {
    // TODO Regex should be taken from somewhere (rules?)
    // old regex const re = new RegExp('^$|^[a-z][a-z0-9]*([,][a-z][a-z0-9]*)*$');
      const re = new RegExp('^$|^[a-z0-9][\-a-z0-9]*[a-z0-9]$');
      const arrayOfTags = value.split('\,');
      for (const t of arrayOfTags) {
        if (!re.test(t)) {
          return false;
        }
      }
     return true;
    };



models;
