const express = require('express'),
      accept = require('accept');

const validateContentType = express.Router();
const validateAccept = express.Router();

/**
 * Check that every request has a valid content type
 * Otherwise respond with 406 Unacceptable
 * This is an express router intended to be used with app.use() at the beginning of the application
 */
validateContentType
  // check that PATCH /users/:username/avatar has content-type: multipart/form-data
  .patch('/users/:username/avatar', (req, res, next) => {
    const isMultipart = /^multipart\/form-data/.test(req.headers['content-type']);

    if (isMultipart) {
      req.contentTypeChecked = true;
      return next();
    }

    return res.status(406).end();
  })
  // check that everything else has content-type: application/vnd.api+json
  .all('*', (req, res, next) => {
    // if we already checked the content-type, continue
    if (req.contentTypeChecked) {
      delete req.contentTypeChecked;
      return next();
    }

    if (req.headers['content-type'] === 'application/vnd.api+json') {
      return next();
    }

    return res.status(406).end();
  });

/**
 * Validate request's Accept header
 * We expect it to strictly contain one or all of the possible Content-Types
 */
validateAccept
  .get('/users/:username/avatar', (req, res, next) => {

    const expected = accept.mediaTypes(req.headers.accept);

    const hasJpeg = expected.includes('image/jpeg');
    const hasSvg = expected.includes('image/svg+xml');

    if (hasJpeg && hasSvg) {
      req.acceptHeaderChecked = true;
      return next();
    }

    return res.status(406).end();
  })
  .all('*', (req, res, next) => {

    if (req.acceptHeaderChecked) {
      delete req.acceptHeaderChecked;
      return next();
    }

    const expected = accept.mediaTypes(req.headers.accept);

    const hasJsonApi = expected.includes('application/vnd.api+json');
    if (hasJsonApi) {
      return next();
    }

    return res.status(406).end();
  });

module.exports = { validateContentType, validateAccept };
