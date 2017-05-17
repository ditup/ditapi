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

exports.patchConfirmContact = async function (req, res, next) {
  const [from, to] = req.body.id.split('--');

  if (req.auth.username !== from) {
    return res.status(403).json({
      errors: [{ meta: 'you can only confirm your contacts'}]
    });
  }

  const { trust, reference } = req.body;

  try {
    await models.contact.confirm(from, to, { trust, reference });
    return res.end();
  } catch (e) {
    if (e.code == 404) {
      return res.status(404).json({
        errors: [{ meta: e.message }]
      });
    } else if (e.code == 403) {
      return res.status(403).json({
        errors: [{ meta: e.message }]
      });
    }

    return next(e);
  }
};
