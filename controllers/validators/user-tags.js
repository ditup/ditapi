const validate = require('./validate-by-schema');

// PATCH /users/:username/tags/:tagname
const patch = validate('patchUserTag', [['body.id', ['params.username', 'params.tagname'], function (id, names) {
  // id should equal username--tagname
  return id === names.join('--');
}]]);

// POST /users/:username/tags
const post = validate('postUserTags');

module.exports = { patch, post };
