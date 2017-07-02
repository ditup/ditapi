//PARSER

const parametersDictionary = {
	"page": {
		"limit": "int",
		"offset": "int"
	}
}


var parseQuery = function (query, parametersDictionary) {
	for (let q in query){
		console.log(q);
		if (parametersDictionary.hasOwnProperty(q)) {
			console.log(q)
			if (query[q] !== null && typeof query[q] === 'object' && parametersDictionary[q] !== null && typeof parametersDictionary[q] === 'object') {
				//go thought whole array
				query[q] = parseQuery(query[q], parametersDictionary[q]);
			} else if ( query[q] === null || parametersDictionary[q] === null) {
				continue;
			} else {
				switch (parametersDictionary[q])
				{
   					case "int": {
   						console.log("isInt")
   						const number = parseInt(query[q]);
						if (Number.isInteger(number))
							query[q] = number;
						break;
					}
   					case "array": {
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

module.exports = { parseQuery }