'use strict';

const user = {
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
};

const tag = {
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
  get id() {
    return this.tagname;
  }
};

const message = {
  body: {
    notEmpty: true,
    isLength: {
      options: [{ max: 2048 }]
    }
  }
};

module.exports = { user, tag, message };

