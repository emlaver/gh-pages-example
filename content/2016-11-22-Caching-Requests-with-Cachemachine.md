---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2016-11-22T09:00:00.000Z
description: With cachemachine and redis
image: /img/markus-spiske-254336-unsplash.jpg
relcanonical: https://developer.ibm.com/clouddataservices/2016/11/22/10602/
tags:
  - Cache
  - Redis
title: Caching HTTP requests
type: blog
url: /2016/11/22/Caching-Requests-with-Cachemachine.html
---


A cache is a copy of data stored in place where it can be retrieved quickly with the original and most up-to-date copy being a separate, slower repository. Examples of caching include:

- microprocessors contain on-board data caches to save having to fetch the data from memory.
- spinning disks contain a cache of a data in memory to save having to fetch data on disk.
- web browsers cache a page's assets on the client machine to save having to fetch data from the network.

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Latency numbers every programmer should know <a href="https://t.co/H0Bp2nYivt">pic.twitter.com/H0Bp2nYivt</a></p>&mdash; Mario Fusco (@mariofusco) <a href="https://twitter.com/mariofusco/status/785948217217282048">October 11, 2016</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

Your own systems can achieve huge performance benefits if you build in a caching layer, choosing to cache data that is accessed frequently--data that still has value when stale--and deciding how long to cache each item. A cache provides speed benefits for your application, and takes load away from your primary data source, freeing up resources for other work. 

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Table of system latencies makes for great reading <a href="https://t.co/346giJZQnh">pic.twitter.com/346giJZQnh</a></p>&mdash; Azeem Azhar (@azeem) <a href="https://twitter.com/azeem/status/669678968359034880">November 26, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

## Caching fast changing data

Imagine I am storing web metrics data in an [IBM Cloudant](https://cloudant.com/) database where each JSON document represents an interaction with my web page:

```js
{
  "date": "2016-09-01 10:24:13",
  "type": "click",
  "path": "/Born-Run-Bruce-Springsteen/dp/1471157792/",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36",
  "host": "www.bookseller.com",
  "userid": "yJBsMCs4qEyF89jvGD1cI1V81YdNw6"
}
```

I can use a MapReduce function in Cloudant with the `_count` reducer to create an aggregated view of my data, counting the number of 'click' documents by day:

```js
function(doc) {
  if (doc.type === 'click') {
    var d = doc.date.split(' ')[0];
    emit(d, null);
  }
}
```

I can then create a Node.js dashboard to query the view and present the results:

```js
var myurl = 'https://myusername:mypassword@myhost.cloudant.com';
var cloudant = require('cloudant')({ url: myurl });
var db = cloudant.db.use('metrics');
db.view('clicks', 'byday', {group: true}, function(err, data) {
  console.log(data);
  // present the data on the dashboard.
});
````

The call to the Cloudant view will retrieve data of this form:

```js
{ "rows":[
    {"key":"2016-09-01", "value":10985882},
    {"key":"2016-09-02", "value":11884271},
    {"key":"2016-09-03", "value":12004155},
    {"key":"2016-09-04", "value":11094426}
  ]
}
```

Cloudant is more than happy to answer queries like this, as its distributed design shares the computational load around its cluster. But every time your dashboard web page loads, you ask Cloudant to recalculate the totals and to rebuild the view to incorporate the newly arrived documents. As the rate of change of data is not insignificant (circa 11m documents a day, or 127 per second), then Cloudant has its work cut out for it!

You can employ caching in this use-case to take some load from Cloudant by storing the daily totals in cache when they are first requested. The time-to-live (TTL) of the cache is a choice: is it ok for the users to see data that is 1 hour old? 10 minutes old? The longer the TTL, the less load Cloudant sees, but the more out-of-date the dashboard is. 

Using an in-memory cache in front of Cloudant would give the dashboard a faster load time and let Cloudant get on with the core task of storing and indexing the incoming data.

## Redis

[Redis](http://redis.io/) makes an ideal cache because it stores its data in RAM for fast storage and retrieval. Redis at its simplest, stores key/value pairs and can additionally expire the keys at a pre-defined TTL. To store a key (mykey) with an associated value (xyz) that expires in an hour, you can use Redis's `SETEX` command:
 

```
  SETEX mykey 3600 "xyz"
``` 

Retrieve the value at any time within the next hour with

```
  GET mykey
```

## Caching Cloudant data with cachemachine

To cache HTTP requests to Cloudant, we can use the [cachemachine](https://www.npmjs.com/package/cachemachine) utility as a drop-in replacement for the [request](https://www.npmjs.com/package/request) library with a twist--it caches the paths you specify in a Redis cache. The first time you ask for the data, Cloudant responds and the result is cached. All other requests for the same URL (within the TTL) are answered by calls to Redis!

In this case, we want to cache requests that access views for only one hour (paths beginning with the database name followed by `/_design/`):

```js
var paths = [ { path: '^/mydb/_design/.*', ttl: 60*60 }];
var cachemachine = require('cachemachine')({redis: true, paths: paths});
```

We can then tell the [Cloudant Node.js library](https://www.npmjs.com/package/cloudant) to use this as a plugin:

```js
var cloudant = require('cloudant')({ url: myurl, plugin: cachemachine });
```

Now requests we make to our view are cached automatically:

```js
db.view('clicks', 'byday', {group: true}, function(err, data) {
  // data is returned and cached transparently
  console.log(data);
});
```

Cloudant handles the first request for the data, but subsequent requests for the same data come from Redis, until the cache key expires.

## Building a caching proxy server with Express and cachemachine

You can also create your own proxy server in front of Cloudant, caching the requests you want to intercept and passing all other requests untouched. 

```js
var express = require('express'),
  app = express(),
  cachemachine = require('cachemachine')(),
  couchURL = process.env.COUCH_URL || 'http://localhost:5984';

// intercept all requests for GET requests for views
app.get('/:db/_design/:design/_view/:view', function (req, res, next) {
  var r = {
    url: couchURL + req.path,
    qs: req.query
  };
  // handle them with cachemachine
  cachemachine(r, function(err, response, body) {
    res.send(body);
  });
});

// Catch all other paths and proxy them to CouchDB
app.use('/', require('express-http-proxy')(couchURL));

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
```

This code doesn't use cachemachine's path matching, it simply catches the paths it needs to intercept and routes them through cachemachine, leaving all other traffic to be transparently proxied.

## Using cachemachine with Redis on Compose

Deploying a highly-available Redis cluster is easy with [Redis on Compose](https://www.compose.com/redis). It deploys in minutes in a choice of data centers. Using `cachemachine` with Compose's Redis is just as simple:

```js
var opts = {
  redis: true,
  hostname: 'myhostname.dblayer.com',
  port: 10000,
  password: 'mypassword'
};
var request = require('cachemachine')(opts);
```

substituting the values of `hostname`, `port` and `password` for those found in your Compose dashboard.

## Conclusion

Caching provides quicker access to frequently-requested data, trading-off speed of delivery for freshness of the data. You tell your app how stale you can afford to let the data get by configuring the TTL of cache key. Caching lets your application respond quickly, while not overburdening underlying data storage services. Use the [cachemachine](https://www.npmjs.com/package/cachemachine) to transparently cache any HTTP service with Redis as the cache store, and plug it directly into the [Cloudant Node.js library](https://www.npmjs.com/package/cloudant).