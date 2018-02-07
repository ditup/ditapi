'use strict';

const path = require('path');

const { html: sanitizeHtml, plainText: sanitizeText } = require(path.resolve('./services/text'));

/**
 * Given an object, sanitize all its string properties (deep)
 * @param {object} object - the object to sanitize
 * @param {string[]} htmlFields - a list of fields which are allowed to contain some html, the rest is plaintext
 */
function sanitizeObjectProperties(object, htmlFields) {
  for (const field in object) {
    // sanitize all string fields of the object
    switch (typeof object[field]) {
      case 'string': {
        if (htmlFields.indexOf(field) > -1) {
          // some of them are expected to be html
          object[field] = sanitizeHtml(object[field]);
        } else {
          // the rest is plaintext
          object[field] = sanitizeText(object[field]);
        }

        break;
      }
      // sanitize nested objects
      case 'object': {
        sanitizeObjectProperties(object[field], htmlFields);
      }
    }
  }
}

/**
 * The middleware sanitizes all string properties of req.body
 * @todo should it sanitize deeply, too?
 */
module.exports = function sanitizer(req, res, next) {

  // body properties which are expected to be html (otherwise plaintext)
  const htmlFields = [
    'description', // user description
    'body', // message body
    'reference', // contact reference
    'message', // contact request message
    'story', // userTag story
    'content', // content of comment
    'detail' // detail of idea
  ];

  sanitizeObjectProperties(req.body, htmlFields);

  return next();
};
