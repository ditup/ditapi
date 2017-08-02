const { ajv } = require('./ajvInit');

module.exports = function (schema) {
  return function (req, res, next) {
    // console.log(req.body, req.params, req.query);
    const valid = ajv.validate(`sch#/${schema}`, req);

    if (!valid) {
      return next(ajv.errors);
    }
    return next();
  };
};

