'use strict';

const _ = require('lodash');

const rules = {
  user: {
    username: {
      notEmpty: true,
      matches: {
        options: [/^(?=.{2,32}$)[a-z0-9]+([_\-\.][a-z0-9]+)*$/]
      },
      errorMessage: 'Invalid Username (only a-z0-9.-_)' // Error message for the parameter
    },
    email: {
      notEmpty: true,
      isEmail: true,
      errorMessage: 'Invalid Email'
    },
    givenName: {
      isLength: {
        options: [{ max: 128 }]
      }
    },
    familyName: {
      isLength: {
        options: [{ max: 128 }]
      }
    },
    description: {
      isLength: {
        options: [{ max: 2048 }]
      }
    },
    get id() {
      return this.username;
    }
  },

  tag: {
    tagname: {
      notEmpty: true,
      isLength: {
        options: [{ min: 2, max: 64 }]
      },
      matches: {
        options: [/^[a-z0-9]+(\-[a-z0-9]+)*$/]
      },
      errorMessage: 'Invalid Tagname (2-64 characters; only a-z, -, i.e. tag-name; but not -tag-name, tag--name, tagname-)'
    },
    description: {
      isLength: {
        options: [{ min: 0, max: 2048 }]
      }
    },
    get id() {
      return this.tagname;
    }
  }
};

exports.postUsers = function (req, res, next) {
  req.checkBody(_.pick(rules.user, ['username', 'email']));

  // prepare and return errors
  const errors = req.validationErrors();

  const errorOutput = { errors: [] };
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.getUsers = function (req, res, next) {
  // parse the query like ?filter[tag]=tag1,tag2,tag3
  req.query.filter.tag = req.query.filter.tag.split(/,\s?/);
  // TODO validate the tagnames in req.query.filter.tag
  return next();
};

exports.getUser = function (req, res, next) {
  req.checkParams(_.pick(rules.user, ['username']));

  const errors = req.validationErrors();

  const errorOutput = { errors: [] };

  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.patchUser = function (req, res, next) {
  req.checkParams(_.pick(rules.user, ['username']));
  req.checkBody(_.pick(rules.user, ['id', 'givenName', 'familyName', 'description']));
  const errors = req.validationErrors();

  const errorOutput = { errors: [] };
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.postTags = function (req, res, next) {
  req.checkBody(_.pick(rules.tag, ['tagname', 'description']));

  const errors = req.validationErrors();

  const errorOutput = { errors: [] };
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({meta: e});
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.getTag = function (req, res, next) {
  req.checkParams(_.pick(rules.tag, ['tagname']));

  const errors = req.validationErrors();

  const errorOutput = {errors: []};
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({meta: e});
    }

    return res.status(400).json(errorOutput);
  }
  return next();
};

exports.patchTag = function (req, res, next) {
  req.checkParams(_.pick(rules.tag, ['tagname']));
  req.checkBody(_.pick(rules.tag, ['id', 'description']));
  const errors = req.validationErrors();

  const errorOutput = { errors: [] };
  if (errors) {
    for(const e of errors) {
      errorOutput.errors.push({ meta: e });
    }
    return res.status(400).json(errorOutput);
  }

  return next();
};

exports.postUserTags = function (req, res, next) {
  return next();
};

exports.patchUserTag = function (req, res, next) {
  // TODO
  return next();
};
