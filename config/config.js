'use strict';

const env = process.env.NODE_ENV;

// load configs: default, environment-specific and secret (gitignored)
const defaultConfig = require('./default'),
      envConfig = require(`./${env}`),
      secret = require(`./secret/${env}`);

const config = assignDeep({ }, defaultConfig, envConfig, secret);

module.exports = config;

/**
 * Helper functions
 */

/**
 * Assigns a target object to original object deeply
 * i.e. if both original and target property is an object,
 * preserves the original subobject's properties and adds the target properties.
 * Mutates the original object
 * @param {object} original - the original
 * @param {object} assigned - the target
 */
function assignDeepOne(original, assigned) {
  // create a copy of target object to not mutate it
  assigned = Object.assign({}, assigned);
  for(const property in assigned) {
    if(isObject(assigned[property])) {
      // when original subobject is not Object, don't go any deeper
      if (!isObject(original[property])) {
        original[property] = { };
      }
      assignDeep(original[property], assigned[property]);
      delete assigned[property];
    }
  }

  Object.assign(original, assigned);
}

/**
 * Deep assigns multiple targets to original object
 * Mutates the original
 * @param {object} original - the original
 * @param {...object} assigneds - target objects
 * @returns object - the mutated original object
 */
function assignDeep(original, ...assigneds) {
  for(const assigned of assigneds) {
    assignDeepOne(original, assigned);
  }
  return original;
}

/**
 * Decide whether a value is a strict object (not an array)
 * @param {any} input - the input value
 * @returns boolean
 */
function isObject(input) {
  return typeof input === 'object' && !Array.isArray(input);
}
