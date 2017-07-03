// PARSER

const parametersDictionary = {
  'page': {
    'limit': 'int',
    'offset': 'int'
  },
  'filter': {
    'tag': 'array'
  }
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