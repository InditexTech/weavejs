<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

[![npm version](https://badge.fury.io/js/angular2-expandable-list.svg)](https://badge.fury.io/js/angular2-expandable-list)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Weave.js / React

> Write a project description

## Prerequisites

This project requires NodeJS (version 8 or later) and NPM.
[Node](http://nodejs.org/) and [NPM](https://npmjs.org/) are really easy to install.
To make sure you have them available on your machine,
try running the following command.

```sh
$ npm -v && node -v
6.4.1
v8.16.0
```

## Table of contents

- [Project Name](#project-name)
  - [Prerequisites](#prerequisites)
  - [Table of contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Serving the app](#serving-the-app)
    - [Running the tests](#running-the-tests)
    - [Building a distribution version](#building-a-distribution-version)
    - [Serving the distribution version](#serving-the-distribution-version)
  - [API](#api)
    - [useBasicFetch](#usebasicfetch)
      - [Options](#options)
    - [fetchData](#fetchdata)
  - [Contributing](#contributing)
  - [Credits](#credits)
  - [Built With](#built-with)
  - [Versioning](#versioning)
  - [Authors](#authors)
  - [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)

Start with cloning this repo on your local machine:

```sh
$ git clone https://github.com/ORG/PROJECT.git
$ cd PROJECT
```

To install and set up the library, run:

```sh
$ npm install -S myLib
```

Or if you prefer using Yarn:

```sh
$ yarn add --dev myLib
```

## Usage

### Serving the app

```sh
$ npm start
```

### Running the tests

```sh
$ npm test
```

### Building a distribution version

```sh
$ npm run build
```

This task will create a distribution version of the project
inside your local `dist/` folder

### Serving the distribution version

```sh
$ npm run serve:dist
```

This will use `lite-server` for servign your already
generated distribution version of the project.

_Note_ this requires
[Building a distribution version](#building-a-distribution-version) first.

## API

### useBasicFetch

```js
useBasicFetch(((url: string) = ''), ((delay: number) = 0));
```

Supported options and result fields for the `useBasicFetch` hook are listed below.

#### Options

`url`

| Type   | Default value |
| ------ | ------------- |
| string | ''            |

If present, the request will be performed as soon as the component is mounted

Example:

```tsx
const MyComponent: React.FC = () => {
  const { data, error, loading } = useBasicFetch(
    'https://api.icndb.com/jokes/random'
  );

  if (error) {
    return <p>Error</p>;
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="App">
      <h2>Chuck Norris Joke of the day</h2>
      {data && data.value && <p>{data.value.joke}</p>}
    </div>
  );
};
```

`delay`

| Type   | Default value | Description          |
| ------ | ------------- | -------------------- |
| number | 0             | Time in milliseconds |

If present, the request will be delayed by the given amount of time

Example:

```tsx
type Joke = {
  value: {
    id: number;
    joke: string;
  };
};

const MyComponent: React.FC = () => {
  const { data, error, loading } = useBasicFetch<Joke>(
    'https://api.icndb.com/jokes/random',
    2000
  );

  if (error) {
    return <p>Error</p>;
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="App">
      <h2>Chuck Norris Joke of the day</h2>
      {data && data.value && <p>{data.value.joke}</p>}
    </div>
  );
};
```

### fetchData

```js
fetchData(url: string)
```

Perform an asynchronous http request against a given url

```tsx
type Joke = {
  value: {
    id: number;
    joke: string;
  };
};

const ChuckNorrisJokes: React.FC = () => {
  const { data, fetchData, error, loading } = useBasicFetch<Joke>();
  const [jokeId, setJokeId] = useState(1);

  useEffect(() => {
    fetchData(`https://api.icndb.com/jokes/${jokeId}`);
  }, [jokeId, fetchData]);

  const handleNext = () => setJokeId(jokeId + 1);

  if (error) {
    return <p>Error</p>;
  }

  const jokeData = data && data.value;

  return (
    <div className="Comments">
      {loading && <p>Loading...</p>}
      {!loading && jokeData && (
        <div>
          <p>Joke ID: {jokeData.id}</p>
          <p>{jokeData.joke}</p>
        </div>
      )}
      {!loading && jokeData && !jokeData.joke && <p>{jokeData}</p>}
      <button disabled={loading} onClick={handleNext}>
        Next Joke
      </button>
    </div>
  );
};
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

1.  Fork it!
2.  Create your feature branch: `git checkout -b my-new-feature`
3.  Add your changes: `git add .`
4.  Commit your changes: `git commit -am 'Add some feature'`
5.  Push to the branch: `git push origin my-new-feature`
6.  Submit a pull request :sunglasses:

## Credits

TODO: Write credits

## Built With

- Dropwizard - Bla bla bla
- Maven - Maybe
- Atom - ergaerga
- Love

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## Authors

- **John Doe** - _Initial work_ - [JohnDoe](https://github.com/JohnDoe)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

[MIT License](https://andreasonny.mit-license.org/2019) © Andrea SonnY
