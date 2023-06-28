---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-09-26T09:00:00.000Z
description: With Cloud Functions and Redis
image: /img/aaron-huber-542345-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/custom-indexers-for-cloudant-6b7e65186db1
tags:
  - Serverless
  - Indexing
title: Custom Indexers
type: blog
url: /2017/09/26/Custom-indexers-for-Cloudant.html
---


Cloudant offers highly available storage and retrieval of JSON documents across a cluster of computing which includes a primary index on the documents' `_id` field. You can also use the same cluster to power secondary indexes built to provide [selection & aggregation using MapReduce](https://console.bluemix.net/docs/services/Cloudant/api/creating_views.html#views-mapreduce-), [full-text search using Apache Lucene](https://console.bluemix.net/docs/services/Cloudant/api/search.html#search), or [GeoSpatial queries](https://console.bluemix.net/docs/services/Cloudant/api/cloudant-geo.html#cloudant-geospatial).

What if you want something a little different that isn't supported by the built-in indexers? You can build you own!

In this article, I'll build a custom in-memory index using Redis whose data is fed from a Cloudant database's changes feed.

## The data

Let's say we're storing documents in Cloudant that represent a page view on our website. Each document represents a single page view:

```js
{
  "_id": "96f898f0f6ff4a9baac4503992f31b01",
  "_rev": "1-ff7b85665c4c297838963c80ecf481a3",
  "path": "/blog/post-1.html",
  "date": "2017-07-04 17:15:59 +00:00",
  "mobile": true,
  "browser": "Chrome",
  "ip": "85.25.222.52"
}
```

The documents are never modified. Instead, we keep writing new documents as events arrive. The data set just keeps growing.

## Custom indexes 

We are going to build two custom indexes in Redis that would be tricky or inefficient to achieve in Cloudant with its built-in indexers. In general, they are queries that do not lend themselves well to key range lookups or text searches:

- Retrieve the top ten pages viewed
- Find the number of unique IP addresses used to access our site

We may also want these statistics broken down by month. Let's examine each query in a little more detail.

### Top ten pages

It's easy to count things in Cloudant. Simply create a MapReduce view with a JavaScript map function:

```js
function(doc) {
  emit(doc.path, null);
}
```

The `map` function emits the path (e.g., `"/blog/post-1.html"`) with a null value. Then we can use the built-in [`_count`](https://console.bluemix.net/docs/services/Cloudant/api/creating_views.html#reduce-functions) reducer which will calculate counts of each value:

```
/blog/post-1.html --> 5028
/blog/post-2.html --> 12025
/blog/post-3.html --> 885
```

What it *doesn't* do for you is sort the list by count (it is sorted by the key instead). To get the most popular, you'd have to query *all* the totals and sort the results yourself. This isn't a big deal if you have a few distinct pages, but if you have tens of thousands, then it makes the query relatively expensive&mdash;especially if you need this answer frequently and quickly.

To solve this problem with Redis, we can store the blog post name and the count in a [Redis sorted set](https://redis.io/topics/data-types#sorted-sets):

```
ZINCRBY 'leaderboard' '/blog/post-1.html' 1
```

Then it is easy to retrieve the top ten items quickly from the in-memory store:

```
ZREVRANGEBYSCORE 'leaderboard' +inf -inf WITHSCORES LIMIT 0 10
```

### Distinct counts of IP addresses

Counting the number of unique IP addresses visiting our site is an example of the [count-distinct problem](https://en.wikipedia.org/wiki/Count-distinct_problem). It uses more memory the more unique things you're counting, and with over 4 billion possible IP addresses, this operation has the potential to get tricky.

Redis offers a solution to this problem with its [HyperLogLog data structure](http://antirez.com/news/75). It allows distinct counts to be performed with a fixed memory footprint of 12kb as long as you can accept an approximate answer (<1% error). 

Data is added to the structure with `PFADD`:

```
PFADD ipcount "85.25.222.52"
```

And the count is retrieved with `PFCOUNT`:

```
PFCOUNT ipcount
```

## Streaming the changes 

We can write a simple Node.js script that glues together Cloudant and Redis. Here's what we want it to do:

- Listen to a Cloudant database's [changes feed](https://console.bluemix.net/docs/services/Cloudant/api/database.html#get-changes)
- Update the totals in the Redis database for each change

![customindex1](/img/customindex1.jpg)

First we need to define some environment variables containing the URLs of our cloud-based Cloudant and Redis services; otherwise, local services are assumed (e.g., local CouchDB on port 5984 and local Redis on port 6739). For example:

```sh
export CLOUDANT_URL="https://USER:PASS@HOST.cloudant.com"
export DBNAME="pageviews"
export REDIS_URL="redis://x:PASS@HOST:PORT"
```

Then we can run a Node.js process that listens to the Cloudant changes feed and writes updates to Redis for each incoming change. Here's the code:

```js
// connect to Cloudant
var cloudant = require('cloudant');
var url = process.env.CLOUDANT_URL || 'http://localhost:5984';
var dbname = process.env.DBNAME || 'pageviews';
var db = cloudant({url:url , plugin: 'promises'}).db.use(dbname);

// connect to Redis
var redis = require("redis");
var redisurl = process.env.REDIS_URL || 'redis://localhost:6379';
var client = redis.createClient(redisurl);
var redis_leaderboard = 'leaderboard';
var redis_ipcount = 'ipcount';

// listen to changes 
var feed = db.follow({since: 'now', include_docs:true});
feed.on('change', function(change) {
  if (change.doc && change.doc.path && change.doc.ip) {
    
    // do multiple Redis commands in 1
    client.multi()
      // increment the leaderboard sorted set
      .zincrby(redis_leaderboard, 1, change.doc.path)
      // add the IP to the HyperLogLog data set
      .pfadd(redis_ipcount, change.doc.ip)
      // execute both actions together
      .exec();
  }
});
feed.follow();
```

As documents are added to the Cloudant database, the Redis `leaderboard` and `ipcount` are updated too!

We can then log into the Redis command-line interface:

```sh
redis-cli -h HOST -p PORT -a PASSWORD
# or redis-cli for a local service
```

And query the data like so:

```
127.0.0.1:6379> PFCOUNT ipcount
(integer) 375608
127.0.0.1:6379> ZREVRANGEBYSCORE 'leaderboard' +inf -inf WITHSCORES LIMIT 0 5
 1) "/blog/post-160.html"
 2) "606"
 3) "/blog/post-152.html"
 4) "597"
 5) "/blog/post-30.html"
 6) "593"
 7) "/blog/post-35.html"
 8) "589"
 9) "/blog/post-191.html"
10) "589"
```

## Monthly reporting

An enhancement to this approach is to have a monthly leaderboard and monthly unique IP address counts. We can easily enable this feature by parsing the date string in the Node.js code and writing to Redis keys with the month included (e.g., `"leaderboard_2017-07"`). On a month boundary, new data will be automatically fed into the next month's key:

```js
// connect to Cloudant
var cloudant = require('cloudant');
var url = process.env.CLOUDANT_URL || 'http://localhost:5984';
var dbname = process.env.DBNAME || 'pageviews';
var db = cloudant({url:url , plugin: 'promises'}).db.use(dbname);

// connect to Redis
var redis = require("redis");
var redisurl = process.env.REDIS_URL || 'redis://localhost:6379';
var client = redis.createClient(redisurl);

// pad
function pad(number) {
  return ("0"+number).slice(-2); 
}

// listen to changes 
var feed = db.follow({since: 'now', include_docs:true});
feed.on('change', function(change) {
  if (change.doc && change.doc.date && change.doc.path && change.doc.ip) {
    
    var d = new Date(change.doc.date);
    var datestr = d.getUTCFullYear() + '-' + (pad(d.getUTCMonth()+1));
    var leaderboard = 'leaderboard_' + datestr;
    var ipcount =  'ipcount_' + datestr;

    // do multiple Redis commands in 1
    client.multi()
      // increment the leaderboard sorted set
      .zincrby(leaderboard, 1, change.doc.path)
      // add the IP to the HyperLogLog data set
      .pfadd(ipcount, change.doc.ip)
      // execute both actions together
      .exec();
    console.log('change', change.doc.path, change.doc.ip);
  }
});
feed.follow();
```

Now look at the Redis keys being generated:

```
127.0.0.1:6379> SCAN 0
1) "0"
2) 1) "ipcount_2017-06"
   2) "leaderboard_2017-06"
   3) "ipcount_2017-07"
   4) "leaderboard_2017-07"
```

We have an `ipcount` HyperLogLog and a `leaderboard` sorted set for each month.

Another feature of the HyperLogLog data type is that we can combine multiple monthly instances to get an approximate unique count across all the counters. For example:

```
127.0.0.1:6379> PFCOUNT ipcount_2017-01 ipcount_2017-02 ipcount_2017-03 ipcount_2017-04 ipcount_2017-05 ipcount_2017-06 ipcount_2017-07 ipcount_2017-08 ipcount_2017-09 ipcount_2017-10 ipcount_2017-11 ipcount_2017-12
```

This query gives us an annual unique IP count from the monthly data structures.

## Going serverless

So far we've created Node.js processes that listen to the Cloudant changes feed. There's another way: if we create an OpenWhisk action that processes a single change, then we can trigger it from a Cloudant changes feed automatically. This passes the responsibility of the changes-feed-handling to OpenWhisk. We only need to to worry about the data processing.

![customindex1](/img/customindex2.jpg)

Here is the [OpenWhisk action](https://github.com/ibm-watson-data-lab/custom-indexes) and the [deployment script](https://github.com/ibm-watson-data-lab/custom-indexes/blob/master/deploy.sh).

As well as handling the changes feed logic, we can also deploy additional OpenWhisk actions that interrogate the Redis database and expose the aggregations as HTTP APIs.

You can access the APIs at the following URLs:

- https://openwhisk.ng.bluemix.net/api/v1/web/NAMESPACE/leaderboard/getipcount.json
- https://openwhisk.ng.bluemix.net/api/v1/web/NAMESPACE/leaderboard/getleaderboard.json

Here, `NAMESPACE` is a combination of your Bluemix username and space. You can find yours by doing `wsk namespace list`.

## Serverless vs. App

Which approach is better? The serverless approach leaves us with less infrastructure to worry about, but there are advantages for the app-based deployment in this case.

- OpenWhisk doesn't allow subscription to the changes feed with `"include_docs=true"` set, so the OpenWhisk action has to call Cloudant to fetch the document body.
- OpenWhisk's stateless nature means that each invocation of the action requires a connection and disconnection to both Cloudant and Redis&mdash;the app will reuse the connections again and again.
- With further refinements to the app, we could reduce the writes to Redis by buffering some of them in the app and only writing to Redis periodically (say every 10 seconds). This approach would be impossible to achieve in OpenWhisk.

OpenWhisk offers a pay-as-you go approach. Each invocation would cost you the [OpenWhisk cost](https://console.bluemix.net/openwhisk/learn/pricing?env_id=ibm:yp:us-south) plus [one read to the Cloudant database](https://www.ibm.com/analytics/us/en/technology/cloud-data-services/cloudant/pricing/) and a [fixed monthly cost for Redis](https://www.compose.com/pricing/#redis). An always-on app approach would incur the cost of a [24x7 Bluemix instance](https://www.ibm.com/cloud-computing/bluemix/pricing) and a [fixed monthly cost for Redis](https://www.compose.com/pricing/#redis).

The best solution depends on the volume of data being processed and which Cloudant & Bluemix plan you are on.

## Custom indexes vs. Built-in indexes

Cloudant already has a number of built-in indexing engines:

- The primary index on the `_id` field
- Secondary [Map/Reduce indexes](https://docs.cloudant.com/creating_views.html)
- Secondary [Search indexes](https://docs.cloudant.com/search.html)
- Secondary [Geospatial indexes](https://docs.cloudant.com/geo.html)

The secondary indexes are defined via the creation of [Design Documents](https://docs.cloudant.com/design_documents.html), or by creating a [Cloudant Query index](https://console.bluemix.net/docs/services/Cloudant/api/cloudant_query.html). Cloudant takes responsibility of the initial build of the index and will keep each index up-to-date automatically as data is added, updated, or modified.

The custom indexes fed from Cloudant's changes feed are not managed by Cloudant. It is your responsibility to create the index from a standing start and to keep it up-to-date as the data changes over time. If you were starting with pre-existing data, you would have to spool through all the changes feed from zero to build up a first-cut of the index. If your custom indexer went offline for a time, you'd have to be careful that you hadn't missed some changes! 

## Conclusion

We've seen how we can write code to process a Cloudant database's changes feed, writing running totals and counts to an in-memory store. It's a use-case for problems that don't suit Cloudant's built-in indexing engines. We have also seen how the code can be deployed to the OpenWhisk serverless platform.

For more, see the [code on Github](https://github.com/ibm-watson-data-lab/custom-indexes). Thanks for reading!