# ditapi

[![Build Status](https://travis-ci.org/ditup/ditapi.svg?branch=master)](https://travis-ci.org/ditup/ditapi)

REST API for [ditup](http://ditup.org). The web app for the API is based [here](https://github.com/ditup/ditapp).

Follows [JSON API](http://jsonapi.org) specification.

## Prerequisities

- Node.js 8.0.0+. We use cutting-edge EcmaScript features like [async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function), which are supported since [v7.0.1](http://node.green/#async-functions). We use util.promisify, which is supported since node 8.0.0.
- npm v?
- Arangodb v3.0 or later
- maildev
- @todo

## Install

- @todo
- clone this repository
- run `npm install` in the repository folder
- run `npm run init` to create folders for avatar uploads
- run `NODE_ENV=development node ./bin/init-db`

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

[API documentation](https://ditup.github.io/apidoc) ([raw](apidoc.raml)) written with [RAML](https://raml.org)

## Development

### Linting

Use one of the following:

```bash
npm run lint
npm run lint:fix
```
### Testing

We practice behavior-driven development (BDD):

- figure out expected behaviour
- write a failing test of the behavior
- make the test pass
- refactor
- repeat

Use one of the following:

```bash
npm test
npm run test:watch
```

## Collaboration

If you want to collaborate on the creation of ditup, let's get in touch.
