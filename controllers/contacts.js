'use strict';

const path = require('path'),
      _ = require('lodash'),
      serialize = require(path.resolve('./serializers')).serialize,
      models = require(path.resolve('./models'));

exports.patchConfirmContact = async function (req, res, next) {
  const [from, to] = req.body.id.split('--');

  if (req.auth.username !== from) {
    return res.status(403).json({
      errors: [{ meta: 'you can only confirm your contacts'}]
    });
  }

  const { trust, reference } = req.body;

  try {
    const updated = await models.contact.confirm(from, to, { trust, reference });
    const serializedUpdated = serialize.contact(updated);
    return res.status(200).json(serializedUpdated);
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

// functions without goto redirection

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

/**
 * Update a contact (trust, reference for all, message only if unconfirmed)
 */
exports.patchContact = async function (req, res, next) {
  const { from, to } = req.params;

  const { trust, reference, message } = req.body;

  try {
    await models.contact.update(from, to, { trust, reference, message });
  } catch (e) {
    switch (e.status) {
      case 404: {
        return res.status(404).json({
          errors: [{ meta: e.message }]
        });
      }
      case 400: {
        return res.status(400).json({
          errors: [{ meta: e.message }]
        });
      }
      default: {
        throw e;
      }
    }
  }

  return next();
};

exports.getContact = async function (req, res, next) {
  const { from, to } = req.params;
  try {
    const contact = await models.contact.read(from, to);
    contact.id = `${from}--${to}`;

    if (contact.isConfirmed !== true) {
      // only requester or requested (owner) can see the unconfirmed reference
      const isOwner = req.auth.username === from || req.auth.username === to;
      if (!isOwner) {
        return res.status(404).end();
      }
      // when contact is unconfirmed and i'm the requested,
      // don't see trust & reference
      if (req.auth.username !== from) {
        delete contact.trust;
        delete contact.reference;
      }
    }

    const serialized = serialize.contact(contact);
    return res.status(200).json(serialized);
  } catch (e) {
    if (e.code === 404) {
      return res.status(404).end();
    }
    return next(e);
  }
};

exports.deleteContact = async function (req, res, next) {
  const { from, to } = req.params;

  // proceed only if the logged user is owner
  const isOwner = req.auth.username === from || req.auth.username === to;
  if (!isOwner) return res.status(403).end();

  try {
    await models.contact.remove(from, to);
    return res.status(204).end();
  } catch (e) {
    if (e.code === 404) {
      return res.status(404).end();
    }

    return next(e);
  }
};

exports.getContacts = async function (req, res, next) {
  const hasFrom = _.has(req, 'query.filter.from');
  const hasTo = _.has(req, 'query.filter.to');
  if ((hasFrom) ? !hasTo : hasTo) { // XOR
    const { filter: { from, to } } = req.query;

    const includeUnconfirmed = (req.auth.username === from) || (req.auth.username === to);
    try {
      const contacts = await models.contact.filter({ from, to, includeUnconfirmed });

      for (const c of contacts) {
        // create the id
        c.id = `${c.from.username}--${c.to.username}`;

        // the unconfirmed contacts should not leak trust & reference to requested
        if (c.isConfirmed !== true && req.auth.username === to && c.trust !== null) {
          delete c.trust;
          delete c.reference;
        }
      }

      const serialized = serialize.contact(contacts);

      return res.status(200).json(serialized);

    } catch (e) {
      return next(e);
    }
  }
};
