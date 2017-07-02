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
  'page': {
    'limit': 'int',
    'offset': 'int'
  }
};


const parseQuery = function (query, parametersDictionary) {
    // looks for parameters from query listed id dictionary (on the first nesting level)
  for (const q in query){
    if (parametersDictionary.hasOwnProperty(q)) {
        // if parameter has his own parameters, recurentially check if they exist in dictionary (on the next nested level)
      if (query[q] !== null && typeof query[q] === 'object' && parametersDictionary[q] !== null && typeof parametersDictionary[q] === 'object') {
        query[q] = parseQuery(query[q], parametersDictionary[q]);
        // null on any side - skip parameter
      } else if ( query[q] === null || parametersDictionary[q] === null) {
        continue;
        // if parameter is not an object, it's value is parsed
      } else {
        switch (parametersDictionary[q])
        {
          case 'int': {
            const number = parseInt(query[q]);
            // avoids passing NaN (after parsing string with a not numerical value)
            if (Number.isInteger(number))
              query[q] = number;
            break;
          }
          case 'array': {
            const queryString = query[q];
            const array = queryString.split(',');
            query[q] = array;
            break;
          }
        }
      }
    }
  }
  return query;
};

module.exports = { parseQuery, parametersDictionary };