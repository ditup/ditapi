'use strict';

const { tagname, username, messageId } = require('./paths');

const urlParams = {
  id: 'urlParams',
  properties: {
    params: {
      properties: {
        tagname,
        username,
        id: messageId,
        from: username,
        to: username
      }
    }
  }
};

module.exports = { urlParams };
