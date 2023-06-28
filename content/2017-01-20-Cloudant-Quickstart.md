---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-01-20T09:00:00.000Z
description: Simple Cloudant Node.js library
image: /img/goh-rhy-yan-273919-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/cloudant-and-node-js-made-simple-with-the-cloudant-quickstart-library-7deb7601448c
tags:
  - Node.js
title: cloudant-quickstart
type: blog
url: /2017/01/20/Cloudant-Quickstart.html
---


I frequently talk with developers who are using Cloudant or Apache CouchDB for the first time and I've found that things they find most difficult to come to terms with are:

- Design Documents - a feature unique to this database family. They are special documents holding index definitions a other data manipulation magic. Once mastered, they can be used to great effect but to a first-timer they are baffling.
- Multi-version Concurrency Control - MVCC is the mechanism whereby documents are stored in a tree of revisions, allowing databases to be synced with other copies without data loss.

In a lot of use-cases, the developer doesn't want to have to learn about Design Documents to query or aggregate data nor do they want MVCC getting in the way of storing and updating their data. What would Cloudant or CouchDB look like without these concepts? Or without show & list functions, update handlers, attachments and replication?

To find out, I wrote the *cloudant-quickstart* library that hides away this powerful but esoteric functionality and concentrates on making data manipulation simple and intuitive.

## Introducing cloudant-quickstart

The *cloudant-quickstart* library is a Node.js module that can be used with Cloudant and allows:

- database creation
- document insert, update, bult insert and delete
- document get, multi-get and bulk fetch
- database querying
- aggregation for counting, totalising and statistics

All of this is achieved without you dealing with any of Cloudant's inner complexities.

## Installing

The library can used within your own project like so:

```sh
> npm install --save cloudant-quickstart
```

and then used within your code by adding the URL of your Cloudant instance and defining which Cloudant database you want to work with:

```js
var url = 'https://myusername:mypassword@host.cloudant.com';
var cities = require('cloudant-quickstart')(url, 'cities');
```

## Creating a database

A new Cloudant database can be created on first-use with the `create` function:

```js
cities.create();
```

All the function calls we make are going to be asynchronous: they return a [Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) which you handle with 'then' and 'catch' functions, but for brevity, I've omitted much of the scaffolding from the code samples. e.g. to log the output of the `info` function you could do

```js
cities.info().then(console.log)
```

We are going to import some data from [geonames.org](http://www.geonames.org/) which stores the location and population of cities of the world.

## Inserting data

Single documents can be added to a database with the `insert` function:

```js
var city = { 
  _id: '3041563', 
  name:'Andorra la Vella', 
  latitude: 42.50779, 
  longitude: 1.52109, 
  country: 'AD', 
  population: 15853, 
  timezone: 'Europe/Andorra' 
};
cities.insert(city);
```

If an `_id` property is supplied, then this becomes the key field of the document. If omitted, an '_id' is automatically generated.

The same function can be used to insert multiple documents - simply pass in an array of objects instead:

```js
var multi = [
  {
    _id: '1000501',
    name: 'Grahamstown',
    latitude: -33.30422,
    longitude: 26.53276,
    country: 'ZA',
    population: 91548,
    timezone: 'Africa/Johannesburg'
  },
  {
    _id: '1000543',
    name: 'Graaff-Reinet',
    latitude: -32.25215,
    longitude: 24.53075,
    country: 'ZA',
    population: 62896,
    timezone: 'Africa/Johannesburg'
  }
];
cities.insert(multi);
```


The array of data can be as long as you like. Let's get some data from Github and store it in a local file:

```sh
curl https://raw.githubusercontent.com/glynnbird/cities/master/cities.json > cities.json
```

It can then be imported in batches with one function call:

```js
var mydata = require('./cities.json');
cities.insert(data);
```

Records can be retrieved by their ids with the `get` function singly:

```js
cities.get('1000543');
```

or in batches by providing an array of ids:

```js
cities.get(['1000501', '1000543']);
```

Individual documents can be updated by supplying the id and a new document body to the `update` function (or just a new object):

```js
cities.update('1000501', newdoc);
```

and a document can be deleted with the `del` function:

```js
cities.del('1000501');
```

Assuming we have managed to create a suitable data set, then we next need to query it.

## Querying data

The database can by queried by any field by using the `query` function, passing in a query object:

```js
cities.query({ name: 'York' }).then(console.log);
[ { _id: '2633352',
    name: 'York',
    latitude: 53.95763,
    longitude: -1.08271,
    country: 'GB',
    population: 144202,
    timezone: 'Europe/London' },
  { _id: '4562407',
    name: 'York',
    latitude: 39.9626,
    longitude: -76.72774,
    country: 'US',
    population: 43718,
    timezone: 'America/New_York' } ]
```

The query can also contain [Cloudant Query selector operators](https://docs.cloudant.com/cloudant_query.html#selector-syntax):

```js
// find cities with a population > 5m
cities.query({ population: { '$gt': 5000000} })

// cities with population > 5m in Brazil or USA
cities.query({ population: { '$gt': 5000000}, country: { '$in': ['BR','US']} })
```

## Aggregation 

Create aggregated views of your data with the `count`, `sum` and `stats` functions.

The `count` function simply counts things:

```js
cities.count().then(console.log)
23515
```

or can count things grouped by other fields within the document:

```js
// get counts of cities by country code
cities.count('country').then(console.log);
{ AD: 2,
  AE: 13,
  AF: 48,
  AG: 1,
  AI: 1...
```

The `sum` function calculates totals:

```js
// get sum of all population fields
cities.sum('population').then(console.log);
2694222973
```

and can be used to group the totals by other fields:

```js
// get totals of population grouped by country
cities.sum('population','country').then(console.log);
{ AD: 36283,
  AE: 3272938,
  AF: 6308267,
  AG: 24226...
```

The `stats` function calculates statistics on one or more fields, which can be grouped by other fields

```js
// get stats on cities' population by timezone and country
cities.stats('population', 'timezone').then(console.log);
{ 'Africa/Abidjan': 
   { sum: 8399817,
     count: 57,
     min: 15068,
     max: 3677115,
     mean: 147365.2105263158,
     variance: 240877692698.44693,
     stddev: 490792.9224208993 },
  'Africa/Accra': 
   { sum: 7064394,
     count: 58,
     min: 18077,
     max: 1963264,
     mean: 121799.89655172414,
     variance: 96426027195.8169,
     stddev: 310525.4050731065 },...
```

## How does this work?

It's still Cloudant under-the-hood but this library is taking care of a few details on your behalf:

- when you create a database, a [Cloudant Query](https://docs.cloudant.com/cloudant_query.html) index is created that indexes all fields. This index then powers the `query` operator.
- the `update` and `delete` functions hide revision tokens from you - behind the scenes these operations fetch the latest revision, over-writing the data with your supplied document. If it doesn't work, it tries again later, up to three times, at increasingly longer time intervals.
- the `count`, `sum` and `stats` functions use Cloudant's MapReduce to work, creating the required Design Document if necessary.

In production systems, it's important to understand Design Documents, MVCC and the other features of Cloudant, but when you're getting started
it's helpful to be able to write data quickly and create queries without any fuss.

## Is this free?

Yes! This is a free, open-source library that can work with any Cloudant account. 

- Code - https://github.com/glynnbird/cloudant-quickstart
- NPM page: https://www.npmjs.org/package/cloudant-quickstart

Feel free to give it a go and we'd welcome any feedback through the project's [Github Issues](https://github.com/glynnbird/cloudant-quickstart/issues) page.
