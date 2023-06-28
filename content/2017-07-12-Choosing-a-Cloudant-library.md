---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-07-12T09:00:00.000Z
description: Which level of abstraction is right for you?
image: /img/tobias-fischer-185901-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/choosing-a-cloudant-library-d14c06f3d714
tags:
  - Library
  - Node.js
title: Choosing a Cloudant library
type: blog
url: /2017/07/12/Choosing-a-Cloudant-library.html
---


The beauty of Apache CouchDB and Cloudant is that you don't need to a library to be able to start using it. Some databases require a "driver" module to be installed to handle communication between your application and your database, but when your database speaks HTTP then you only need `curl`, a web browser, or anything that can make web requests. For example:

- your Raspberry Pi could write IoT data to a remote database by making PUT requests from curl
- your web page could fetch data directly from the database by making in-page HTTP calls
- your PHP code could read and write from its data store without any third-party add-on code

Sometimes developers need a little help. To avoid repeating the same low-level code, to abstract the API calls into more semantically meaningful methods, and to *make life easier* we often employ libraries.

![library]({{< param "image" >}})
> Photo by [Tobias Fischer](https://unsplash.com/photos/PkbZahEG2Ng) on Unsplash

In this article we'll explore some options that a JavaScript/Node.js developer could choose when writing code against CouchDB or Cloudant, from the lowest level to the highest.

## Level 0 - no libraries

If you want to learn the HTTP in detail, then you can choose to use no libraries whatsoever:

```js
const url = process.env.CLOUDANT_URL;
const db = 'appointments';
const https = require('https');
const req = https.request(url + '/' + db + '/_all_docs?include_docs=true', (res) => {
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
});

req.on('error', (e) => {
  console.error(e.message);
});
req.end();
```

This approach uses the [Node.js https](https://nodejs.org/api/https.html) library to make a single API call. It leaves you to formulate your own URL and to join the separate chunks of reply data into a complete JSON response.

## Level 1 - an HTTP request library

To help with formulating HTTP requests, there a several third-party HTTP libraries to choose from. I usually go for [request](http://npmjs.com/package/request), but others are available.

```js
var request = require('request');
const url = process.env.CLOUDANT_URL;
const db = 'appointments';
var r = {
  method: 'get',
  url: url + '/' + db + '/_all_docs',
  qs: {
    include_docs: true
  },
  json: true
};
request(r, function(err, response, body) {
  console.log(body);
}); 
```

The *request* module makes it simpler to deal with HTTP requests, and if you ask it nicely, it will parse the JSON response for you too. You still get to learn the CouchDB API, but the mechanics of making the HTTP call are simplified.

## Level 2 - the Nano library

[Nano](https://www.npmjs.com/package/nano) is an open-source project that was donated to the Apache Software Foundation and has become the official Node.js library for CouchDB.

It doesn't actually do much &mdash; it is a thin wrapper around CouchDB's API &mdash; but it does make your code a little easier to write and to maintain:

```js
var nano = require('nano');
const url = process.env.CLOUDANT_URL;
const db = 'appointments';
var mydb = nano(url).db.use(db);
mydb.list({include_docs:true}, function(err, data) {
  console.log(data);
});
```

Using Nano allows you to abstract the API calls away. In this case, the `list` function makes a `GET /db/_all_docs` API call. You can use the Nano library and not know what API calls are being made on your behalf. 

## Level 3 - the Cloudant SDK

The [Cloudant](https://www.npmjs.com/package/cloudant) library is the officially support method of interacting with your Cloudant database:

```js
const { CloudantV1 } = require('@ibm-cloud/cloudant')
const service = CloudantV1.newInstance()
const DB = 'appointments'
const list = await service.postAllDocs({
  db: DB
  includeDocs: true
})
console.log(list)
```

## Level 4 - PouchDB

You can use [PouchDB](https://www.npmjs.com/package/pouchdb-http) as an HTTP-only client too:

```js
var PouchDB = require('pouchdb-http');
const url = process.env.CLOUDANT_URL;
var db = new PouchDB(url);
db.allDocs({include_docs:true}).then(console.log);
```

It has its own naming convention for functions, but function calls result in the equivalent API call. If you're developing with PouchDB on the client side, it may be easier to stick with the same API to deal with your server-side CouchDB or Cloudant database.


## Alternatives

The great thing about open-source is that you aren't limited to "official" products. If you don't like the tools, help improve the open-source offerrings by raising issues or submitting code &mdash; find alternative tools or build your own! You can choose whether you're looking for a library that can do callbacks or Promises and whether it allows you to learn the CouchDB API or hides it from you.

In my opinion, it makes sense to get started with a high-level library that abstracts and hides details from you at first. It allows you to build more quickly with less distraction. As you get more serious in your work, you may find you need to see more detail and switch to a lower-level of abstraction.