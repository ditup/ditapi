# ditapi

[![Build Status](https://travis-ci.org/ditup/ditapi.svg?branch=master)](https://travis-ci.org/ditup/ditapi)

REST API for [ditup](http://ditup.org). The web app for the API is based [here](https://github.com/ditup/ditapp).

Follows [JSON API](http://jsonapi.org) specification.

## Prerequisities

- Node.js v7.0.1 or later. We use cutting-edge EcmaScript features like [async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function), which are supported since [v7.0.1](http://node.green/#async-functions).
- npm v?
- Arangodb v3.0 or later
- maildev
- @todo

## Install

- @todo
- fork this repository
- `cd` to the folder of this repository
- run `npm install`

## Run

```bash
NODE_ENV=development npm start
```

## Test

```bash
npm run test:watch
```

## Technology
### Database
[Arangodb](http://arangodb.com) is _a multi-model NOSQL database_. A model we are particularly interested in is _graphs_. They enable a nice way to model and navigate relationships.

## Documentation

[API documentation](apidoc.apib) written with [API Blueprint](https://apiblueprint.org)

## Development

If you want to collaborate on the creation of ditup, let's get in touch.
