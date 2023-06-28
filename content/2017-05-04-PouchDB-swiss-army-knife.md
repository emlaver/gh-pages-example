---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-05-04T09:00:00.000Z
description: The Swiss Army Knife of databases
image: /img/paul-felberbauer-672975-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/pouchdb-the-swiss-army-knife-of-databases-c5429f3db21f
tags:
  - PouchDB
title: PouchDB
type: blog
url: /2017/05/04/PouchDB-swiss-army-knife.html
---


[PouchDB](https://pouchdb.com/) is a database. It's a JSON document store to be precise, allowing you to create, read, update, delete and query your documents with a simple JavaScript API. It's most commonly used *in a browser*, to keep data on the client side. Storing data *within* the browser allows your web applications to keep working, even when the network connection is flaky or non-existant - this is called an __offline first__ approach. Offline first brings 100% uptime to web applications together with performance gains, better user experience and powers the *Progressive Web App (PWA)* movement.

PouchDB goes to great lengths to store data in a format that allows the client side to be disconnected from the server side, for both copies to be updated (even when updated in different ways) and for the data to *synced* without the loss of data. This is no mean feat - syncing data across a distributed systems is not a problem you want to tackle yourself and PouchDB solves it for you at a stroke.

PouchDB stands on the shoulders of the [Apache CouchDB](http://couchdb.apache.org/) project which defines the protocol and the storage mechanism that allows the seamless syncing of data between occasionally connected replicas. PouchDB to CouchDB, PouchDB to Cloudant, PouchDB to PouchDB - you decide. 

## PouchDB - the in-browser database

Storing data in a web application couldn't be simpler. Get [PouchDB into your web page's code](https://pouchdb.com/guides/setup-pouchdb.html) by which ever means you prefer and then write some JavaScript:

```js
var db = new PouchDB('mydb');
var doc = { 
  name: 'Glynn', 
  team: 'blue', 
  date: '2017-03-24', 
  verified: true 
};
db.put(doc);
```

Read documents back:

```js
db.allDocs();
```

or [run queries](https://github.com/nolanlawson/pouchdb-find), [calculate aggregations](https://pouchdb.com/api.html#query_database) and [lots more](https://pouchdb.com/api.html#overview).

## PouchDB - the server-side database

You can also use PouchDB as the storage mechanism for your single-server, client-side Node.js application. Just `npm install pouchdb` and "require" the library into your code:

```js
var PouchDB = require('pouchdb');
var db = new PouchDB('mydb');
```

and the rest of the code as the same as the client-side example.

## PouchDB - the client library for CouchDB/Cloudant

If you want to write client-side code that speaks to a remote CouchDB or Cloudant server, then you can use PouchDB as a client library:

```js
var remotedb = new PouchDB('https://MYUSERNAME:MYPASSWORD@MYHOST.cloudant.com/mydb');
remotedb.put(doc);
```

By providing a URL instead of database name, PouchDB makes API calls to the remote database, using the same code as if it were a local database.

## PouchDB - that syncing feeling

Syncing data from client to server side copies is also painless. On the client side:

```js
db.sync(remotedb);
```

That's it. Two-way sync from your in-browser database to a remote copy. See [the documentation](https://pouchdb.com/api.html#sync) for more examples, one-way sync and receiving update notifications.

## PouchDB - the HTTP server

If you want to run PouchDB as if it were an Apache CouchDB service, with HTTP API, dashboard and all, then you're only a couple of commands away:

```sh
npm install -g pouchdb-server
pouchdb-server
```

Then visit http://127.0.0.1:5984/_utils/ in your browser to see the dashboard - apart from the colour scheme, you'd be hard-pushed to notice the difference between this and full-fat CouchDB.

![pouchdb server](/img/pouchdb-server.png)

## PouchDB - the app data layer

If you are building [Apache Cordova](https://cordova.apache.org/)-based native mobile applications or [Electron](https://electron.atom.io/)-based desktop apps, then PouchDB can be included in the project and used to provide the data storage API. Storing data with PouchDB unlocks your app's ability to sync its data to the server allowing your app to uncouple from the network and roam free, as apps were intended to do!

## PouchDB - plug in for extra functionality

By adding other plugins, PouchDB can be extended to perform [peer-to-peer sync](https://github.com/natevw/PeerPouch), [social media authentication](https://www.npmjs.com/package/superlogin), [framework integration](https://github.com/angular-pouchdb/angular-pouchdb) and [much more](https://pouchdb.com/external.html).

## PouchDB - where's the catch?

How much does this cost? What are the licensing restrictions? Where do I enter my credit card details? PouchDB is a free, open-source project maintained by volunteers. You are free to use it in your own projects within the generous provisions of the [Apache-2.0](https://github.com/pouchdb/pouchdb/blob/master/LICENSE) license, so what are you waiting for?

## Further reading

* [Installing Web Apps with Electron](https://medium.com/ibm-watson-data-lab/installing-web-apps-with-electron-7a8fa1b12744)
* [Offline First](http://offlinefirst.org/)
* [Scaling Offline First with Envoy](https://medium.com/offline-camp/scaling-offline-first-with-envoy-ada42d130cfc)
* [PouchDB](https://pouchdb.com/)