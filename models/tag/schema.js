'use strict';

module.exports = function ({ tagname, description}) {
  description = description || '';

  return {
    tagname,
    description,
    created: Date.now(),
    history: [
      {
        description,
        time: Date.now(),
        editor: null
      }
    ]
  };
};

