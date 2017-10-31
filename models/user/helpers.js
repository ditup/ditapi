'use strict';

const path = require('path');

const config = require(path.resolve('./config'));

const passStrength = require('zxcvbn');
const account = require('./account');

// based on trustroots code

/**
 * Create a fuzzy offset between specified distances
 * @param {Number} minimum - Minimal distance
 * @param {Number} maximum - Maximal distance
 * @returns {Array<Number>} - array of length 2 (horizontal and vertical offset)
 */
function fuzzyOffset(minimum, maximum) {
  // Please note that Math.random() is not cryptographically secure.
  // For this purpose it's probably ok, but can be improved i.e. with node crypto module.
  if (maximum < minimum) throw new Error('maximum must be greater than minimum');
  const difference = maximum - minimum;
  const randomDistance = Math.floor(difference * Math.random() + minimum); // Distance will be from interval [minimum, maximum)
  const randomDirection = 2 * Math.PI * Math.random(); // Random direction is from interval [0, 2*PI) radians

  const horizontal = randomDistance * Math.cos(randomDirection);
  const vertical = randomDistance * Math.sin(randomDirection);

  return [horizontal, vertical]; // The order doesn't matter here
}

/**
 * Create a fuzzy location
 * Will create an alternative lat,lng by shifting location 100-200 meters to random direction
 * @link http://gis.stackexchange.com/a/2980
 */
function fuzzyLocation(location, inputOffset) {
  const { min: minOffset, max: maxOffset } = inputOffset || config.randomLocationOffset;
  // Offsets in meters, random between 100-200 meters to random direction
  const offset = fuzzyOffset(minOffset, maxOffset);
  const dn = offset[0];
  const de = offset[1];

  // Position, decimal degrees
  const lat = location[0];
  const lng = location[1];

  // Earth’s radius, sphere
  const Radius = 6378137;

  // Coordinate offsets in radians
  const dLat = dn / Radius;
  const dLng = de / (Radius * Math.cos(Math.PI * lat / 180));

  // OffsetPosition, decimal degrees
  const latO = lat + dLat * 180 / Math.PI;
  const lngO = lng + dLng * 180 / Math.PI;

  return [latO, lngO];
}

/**
 * Check strength of a password and generate a password's hash for saving
 * @param {string} password - password string to check and hash
 * @param {string[]} [data] - array of strings which shouldn't be contained
 * in the password. i.e. username
 * @returns Promise<{ hash: string, salt: string, iterations: number }>
 */
async function checkAndHashPassword(password, data = []) {
  // if load, load user's data from database
  // check password strength
  const { score } = passStrength(password, data);

  if (score < 3) {
    const err = new Error('password is too weak');
    err.status = 400;
    throw err;
  }

  // hash password
  return await account.hash(password);
}

module.exports = { randomizeLocation: fuzzyLocation, checkAndHashPassword };
