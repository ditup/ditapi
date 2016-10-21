'use strict';

module.exports = function ({ tagname: tagname, description: description }) {

  return {
    tagname,
    description: description || '',
    created: Date.now(),
  };
};

