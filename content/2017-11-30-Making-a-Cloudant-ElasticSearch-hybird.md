---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-11-30T09:00:00.000Z
description: Moving Cloudant data to ES
image: /img/joshua-coleman-655076-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/making-a-cloudant-elasticsearch-hybrid-6bf9610f4456
tags:
  - ElasticSearch
  - Serverless
title: Elasticsearch hybrid
type: blog
url: /2017/11/30/Making-a-Cloudant-ElasticSearch-hybird.html
---


On the face of it, IBM Cloudant and Elasticsearch seem to be very similar products. They both:

- Store JSON documents without you needing to define a schema up-front.
- Have an HTTP API.
- "Shard" each collection into pieces and store multiple copies across a distributed cluster.
- Can be used to perform "free text" search, i.e., query which documents best match a supplied string.

Cloudant is a resilient database that guarantees that data is stored on disk on multiple nodes when you write your data. Elasticsearch is not a database as such &mdash; it prioritises speed over resiliance and is designed to be used as a secondary index rather than as your primary source of truth. 

In some cases, it may be desirable to take a hybrid approach:

- Store your primary data in Cloudant, directing all Create/Read/Update/Delete (CRUD!) requests to this database.
- Store a copy of the data in Elasticsearch and use it to handle all free-text search queries.

Such a setup needs a means of moving data from Cloudant to Elasticsearch as it changes. In this article, we'll see how to automatically keep the data in sync using a "serverless" function.

![schematic](/img/cloudant-es-bridge.png)

## Cloudant-to-Elasticsearch bridge

The Cloudant database has a [changes feed](https://console.bluemix.net/docs/services/Cloudant/api/database.html#get-changes), an HTTP stream that spools out each add/update/delete that happens to the dataset. By consuming that feed, we can trigger other actions as each change arrives, in this case, writing to an Elasticsearch index. The [IBM Cloud Functions](https://console.bluemix.net/openwhisk/) platform can be configured to listen to the Cloudant changes feed on your behalf, and execute custom code on each change. As IBM Cloud Functions is a "serverless" platform, you don't pay for any fixed computing power to run the actions. You simply pay for the number of invocations of your code, which is proportional to the rate of change of your data.

I've written a script to set up the serverless infrastructure. Clone the code:

```sh
git clone https://github.com/ibm-watson-data-lab/cloudant-es-bridge
cd cloudant-es-bridge
```

All it needs is our Cloudant and Elasticsearch authentication credentials entered as commandline environment variables. (Read the project's [README](https://github.com/ibm-watson-data-lab/cloudant-es-bridge) to see how to sign up for Cloudant, Elasticsearch, and IBM Cloud Functions.)

```sh
export CLOUDANT_HOST="HOST.cloudant.com"
export CLOUDANT_USERNAME="CLOUDANTUSERNAME"
export CLOUDANT_PASSWORD="CLOUDANTPASSWORD"
export CLOUDANT_DB="esbridge"
export ELASTIC_URL="https://ESUSERNAME:ESPASSWORD@HOST.composedb.com:PORT/INDEX/TYPE"
```

Then run the deployment script (which assumes you have the [bx wsk](https://console.bluemix.net/openwhisk/learn/cli) tool installed and configured on your machine):

```sh
./deploy.sh
```

This script performs the following tasks:

- Creates a serverless package with all the configuration you supplied.
- Creates a serverless "action" inside that package.
- Creates a Cloudant connection with your configuration.
- Creates a trigger that fires on your Cloudant database's changes feed.
- Creates a rule that fires your action when the trigger fires.

The upshot is that every time you create, modify or delete a document in Cloudant, the equivalent action happens in your Elasticsearch cluster!

Try creating documents in your Cloudant dashboard, and then check that they appear in the Compose dashboard's "Browser" feature.

The data can then be queried with the Elasticsearch API:

```sh
curl "$ELASTIC_URL/_search?q=aimee"
{
  "took": 110,
  "timed_out": false,
  "hits": {
    "total": 1,
    "max_score": 0.2824934,
    "hits": [
      {
        "_index": "myesindex",
        "_type": "default",
        "_id": "5be1886e8ff5f340947b907ce2ac9e9d",
        "_score": 0.2824934,
        "_source": {
          "firstname": "Aimee",
          "lastname": "Mann",
          "description": "singer songwriter",
          "timestamp": 241
        }
      }
    ]
  }
}
```

## Do I need separate Cloudant & Elasticsearch?

Whether you use Cloudant on its own, or pick Cloudant for storage and Elasticsearch for search, depends on your application and how it's used. 

If your application relies heavily on search, then you may want to direct the search requests to an Elasticsearch cluster that contains a copy of your searchable data. This would allow you to scale your search capability separately to your storage engine.

If search is an occasional or secondary activity in your app, or if you prefer the convenience of fewer moving parts, then you may wish to use Cloudant's built-in [free-text search](https://console.bluemix.net/docs/services/Cloudant/api/search.html#search). While not as fully-featured as Elasticsearch, it can easily handle free-text searches, range queries, and faceting as it is built on the same Lucene library that powers Elasticsearch.

## Open-Source ftw

If you want to build on this utility, the code is [on GitHub](https://github.com/ibm-watson-data-lab/cloudant-es-bridge). It's free and open-sourced via the Apache-2.0 license. You may want to modify the `onchange.js` action to alter the document before it's written to Elasticsearch. You may also need to deploy multiple changes feed listeners for multiple data sources. It's up to you.

    
