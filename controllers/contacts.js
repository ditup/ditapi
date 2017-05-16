'use strict';

const path = require('path'),
      serialize = require(path.resolve('./serializers')).serialize,
      models = require(path.resolve('./models'));

exports.postContacts = async function (req, res, next) {
  const from = req.auth.username;
  const { message, trust, reference, to: { username: to }} = req.body;

  try {
    const contact = await models.contact.create({ from, to, trust, reference, message });
    const serialized = serialize.contact(contact);

    const selfLink = serialized.links.self;
    return res.status(201)
      .set('Location', selfLink)
      .json(serialized);
  } catch (e) {
    if (e.code === 409) {
      return res.status(409).end();
    } else if (e.code === 404) {
      return res.status(404).json({
        errors: [
          { meta: e.message }
        ]
      });
    }

    return next(e);
  }

};
