
/*
 * Parser for parsing queries parameters from strings to ints, arrays..
 * Looks up the query for parameters listed in parametersDictionary.
 * It works for nested parameters.
 * Parameter listed in dictionary is always parsed to given format.
 * Structure of dictionary is javascript object for easier navigation and comparison.
 * For redability it can be changed for list of parameters in dot notation and function creating javascript object.
 * In case of lack of values, query is returned without changed parameter.
 * Parser assumes parameters are in given in a proper format.
 * Possibly TODO:
 * - additional parameter adding query property to parse
 * - additional parameter adding query property to skip while parsing
 * - reaction for errors, lack of parameters
 */

const parametersDictionary = {
  page: {
    limit: 'int',
    offset: 'int'
  },
  filter: {
    tag: 'array',
    withMyTags: 'int',
    location: 'coordinates',
    relatedToTags: 'array'
  },
};


const parseQuery = function (query, parametersDictionary) {
  for (const q in query){
    if (parametersDictionary.hasOwnProperty(q)) {
      if (query[q] !== null && typeof query[q] === 'object' && parametersDictionary[q] !== null && typeof parametersDictionary[q] === 'object') {
        query[q] = parseQuery(query[q], parametersDictionary[q]);
      } else if ( query[q] === null || parametersDictionary[q] === null) {
        continue;
      } else {
        switch (parametersDictionary[q])
        {
          case 'int': {
            const number = parseInt(query[q]);
            if (Number.isInteger(number))
              query[q] = number;
            break;
          }
          case 'array': {
            const queryString = query[q];
            // empty string to empty array
            const array = (queryString) ? queryString.split(',') : [];
            query[q] = array;
            break;
          }
          case 'coordinates': {
            // parse the location
            const queryString = query[q];
            const array = queryString.split(',');

            // create a location from every pair of coordinates, and return array of such locations
            query[q] = [];
            for(let i = 0, len = array.length; i < len; i = i + 2) {
              query[q].push([+array[i], +array[i + 1]]);
            }

            break;
          }
        }
      }
    }
  }
  return query;
};

const parse = function (req, res, next) {
  req.query = parseQuery(req.query, parametersDictionary);
  next();
};

module.exports = { parseQuery, parametersDictionary, parse };
