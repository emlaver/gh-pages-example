---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2018-06-14T06:00:00.000Z
description: Reusing your connection to Cloudant
image: /img/michael-mroczek-191461-unsplash.jpg
relcanonical: https://medium.com/@glynn_bird/optimising-cloudant-for-serverless-7ddafe33c8cd
tags:
  - Serverless
title: Optimising Cloudant for Serverless
type: blog
url: /2018/06/14/Optimising-Cloudant-for-Serverless.html
---


IBM Cloudant is a great fit for serverless applications - build a JSON document in the schema of your choice and post it to a Cloudant database using the HTTP API. Both [IBM Cloud Functions](https://www.ibm.com/cloud/functions) and [IBM Cloudant](https://www.ibm.com/uk-en/marketplace/database-management) can scale to deal with your application's workload without you worrying about operating systems, machine reboots, queues, networking etc.

Building a serverless application makes you think differently about how to optimise for performance:

- each incoming event is handled separately, so you cannot minimise HTTP requests to the database by bundling multiple requests into a single [bulk operation](https://console.bluemix.net/docs/services/Cloudant/api/document.html#bulk-operations).
- slow performance of your action results in increased bills because you pay per millisecond of execution time.
- without using the [Composer](https://www.ibm.com/blogs/bluemix/2017/10/serverless-composition-ibm-cloud-functions/) tooling to allow state to be retained between actions in sequences, each action starts with no state other than the incoming data and any parameters that were configured at deploy-time.

Let's take a look at a very simple Cloud Function that writes some data to Cloudant.

## How Cloud Functions talks to Cloudant

We'll use a Node.js runtime with the latest version of the official [Cloudant Node.js library](https://www.npmjs.com/package/@cloudant/cloudant). 

In a blank directory we can create a new npm project:

```sh
npm init
```

and install the library

```sh
npm install --save @cloudant/cloudant
```

Then we write our own code into a `index.js` file:

```js
// this is our Cloud Function
const main = function(args) { 

  // configure the @cloudant/cloudant library
  const opts = {url: args.url, plugins: ['cookieauth', 'promises']};
  const cloudant = require('@cloudant/cloudant')(opts);  
  const db = cloudant.db.use(args.dbname);
  
  // write a new document to the database
  const doc = {
    timestamp: new Date().getTime(),
    num: Math.random()
  };
  return db.insert(doc);
};

exports.main = main;
```

The above Node.js action simply writes a document to Cloudant when it is invoked. It is deployed with:

```sh
# zip up our action and dependencies
zip -r action.zip index.js node_modules
# upload the zip file to IBM Cloud Functions
bx wsk action update justtesting action.zip \
    --kind nodejs:8 \
    --param url "https://USER:PASS@HOST.cloudant.com" \
    --param dbname justtesting
```

The credentials of your Cloudant service and database name are baked-in to the action as parameters - you'll need to replace `"https://USER:PASS@HOST.cloudant.com"` with your own Cloudant service's admin credentials if you want to run this yourself. 

The action is invoked from the command-line with:

```sh
bx wsk action invoke --blocking justtesting
```

The Cloudant library translates your call to `db.insert` into an HTTP POST passing a new JSON object to Cloudant. You should see the `id` and `rev` of the newly created document output in the terminal.

## What's happening under the hood?

When our action is invoked the Cloudant library is initialized and has some work to do:

- do a DNS lookup to translate your Cloudant hostname into an IP address.
- make a secure HTTPS connection to the Cloudant service which involves performing a [TLS handshake](https://www.ibm.com/support/knowledgecenter/en/SSFKSJ_7.1.0/com.ibm.mq.doc/sy10660_.htm)
- authenticating against the Cloudant service by exchanging your `username` & `password` for a [session cookie](https://console.bluemix.net/docs/services/Cloudant/api/authentication.html#cookie-authentication).

The library handles all of this for us but nevertheless, it is an overhead. Our action is making *two* HTTP requests in series for each invocation of the cloud function. 

You should be concerned about this because *you* are being charged for the execution time of each invocation! 

## Re-using the connection

To avoid making an authentication request each time your action is invoked, we can make use of some inside knowledge of how Cloud Functions works. When you deploy your action, the Cloud Functionsplatform turns your code into a _container_. The platform re-uses the same container again and again when invocations happen often, retaining the code's global variable space. We can use this to our advantage to reuse the Cloudant connection. 

If we store our Cloudant object in a *global* variable (as opposed to the local variable we are using now), our second and subsequent invocations will be able to re-use its data, which includes the authentication cookie. Our code now looks like this:

```js
// global Cloudant database object
var db = null

// this is our Cloud Function
const main = function(args) { 
  
  // if db isn't set we need to set up the library
  if (!db) {
    const opts = {url: args.url, plugins: ['cookieauth','promises']};
    const cloudant = require('@cloudant/cloudant')(opts);  
    db = cloudant.db.use(args.dbname);
  }
  
  // write a new document to the database
  const doc = {
    timestamp: new Date().getTime(),
    num: Math.random()
  };
  return db.insert(doc);
};

exports.main = main;
```

- there is a global variable called `db` which is to hold the Cloudant library object
- when the `main` function is called for the first time, the `db` object is created with the Cloudant configuration. An `if` statement ensures that the `db` object is only created once.
- on the first write to the database, the Cloudant library will first exchange its credentials for a cookie, storing it in the `db` object.
- subsequent invocations that reuse the same container will re-use the cookie inside `db`, and if consequitive innvocations are close enough in time, they will also reuse the same _HTTP_ connection, because the socket is [kept alive](https://en.wikipedia.org/wiki/Keepalive).

The sample principle can be applied to code using the [iam](https://github.com/cloudant/nodejs-cloudant#the-plugins) plugin, IBM Cloud's Identity and Access Management system for authentication.

## I thought global variables were bad?

They are in general, but in this case they allow state to be retained between invocations of our Cloud Function, making our application faster and saving us money!
