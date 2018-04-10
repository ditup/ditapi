const path = require('path'),
      models = require(path.resolve('./models')),
      serializers = require(path.resolve('./serializers'));

/**
 * Middleware to add a care to idea.
 */
async function post(req, res, next) {
  // read data from request
  const { id } = req.params;
  const { username } = req.auth;

  const primarys = req.baseUrl.substring(1);
  const primary = primarys.slice(0, -1);

  try {
    const care = await models.care.create({ from: username, to: { type: primarys, id } });

    const serializedCare = serializers.serialize.care(care);
    return res.status(201).json(serializedCare);
  } catch (e) {
    // handle errors
    switch (e.code) {
      // duplicate care
      case 409: {
        return res.status(409).json({
          errors: [{
            status: 409,
            detail: 'duplicate care'
          }]
        });
      }
      // missing idea
      case 404: {
        return res.status(404).json({
          errors: [{
            status: 404,
            detail: `${primary} doesn't exist`
          }]
        });
      }
      default: {
        return next(e);
      }
    }
  }
}

/**
 * Middleware to DELETE a care from an idea (and other objects in the future).
 */
async function del(req, res, next) {

  // read data from request
  const { id } = req.params;
  const { username } = req.auth;

  // what is the type of the object we care for (i.e. ideas, comments, ...)
  const primarys = req.baseUrl.substring(1);
  const primary = primarys.slice(0, -1);

  try {
    // remove the care from database
    await models.care.remove({ from: username, to: { type: primarys, id } });
    // respond
    return res.status(204).end();
  } catch (e) {
    // handle errors
    switch (e.code) {
      // primary object or care doesn't exist
      case 404: {
        return res.status(404).json({
          errors: [{
            status: 404,
            detail: `care or ${primary} doesn't exist`
          }]
        });
      }
      default: {
        return next(e);
      }
    }
  }
}

module.exports = { del, post };
