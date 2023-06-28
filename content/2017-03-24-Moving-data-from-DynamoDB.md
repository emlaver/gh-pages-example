---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-03-24T09:00:00.000Z
description: Using the dynamodbexport npm module
image: /img/dynamodb.png
relcanonical: https://medium.com/ibm-watson-data-lab/moving-data-from-dynamodb-to-cloudant-or-couchdb-4a4110a4e2d9
tags:
  - DynamoDB
title: Moving data from DynamoDB
type: blog
url: /2017/03/24/Moving-data-from-DynamoDB.html
---


If you have data in an Amazon DynamoDB service and want to move it to IBM Cloudant or Apache CouchDB, how would you go about it? First of all, DynamoDB has a peculiar form of JSON. A single temperature measurement would be expressed like this:

```js
{
	"temperature": {
		"N": "8391"
	},
	"time": {
		"S": "2017-03-09T01:38:11+0000"
	},
	"id": {
		"S": "1489023491"
	}
}
```

Instead of the more straightforward JSON:

```js
{
	"temperature": 8391,
	"time": "2017-03-09T01:38:11+0000",
	"id": "1489023491"
}
```

Cloudant and CouchDB can store any JSON documents with nested objects of arbitrary complexity, whereas DynamoDB stores a series of key values at the top of the JSON tree.

## Getting the data out

The [AWS SDK](https://www.npmjs.com/package/aws-sdk) provides a comprehensive toolkit for interacting with AWS services. You need to to "scan" a whole table, performing a chain of API calls to pull back records in batches until you've consumed them all. I've written a script to do this for you: [dynamodbexport](https://www.npmjs.com/package/dynamodbexport).

First, install the tool:

```sh
$ npm install -g dynamodbexport
```

Define a couple of environment variables with your Amazon API credentials:

```sh
$ export AWS_ACCESS_KEY_ID="OGIIWJGNWNIITJHWTHSO"
$ export AWS_SECRET_ACCESS_KEY="YRPHIIIWJJJYwKLGV28JJuiuwnjiiqq06ASn"
```

Then simply run *dynamodbexport*, supplying the name of the table to export and the AWS region it is hosted in:

```sh
$ dynamodbexport --table iot --region us-east-1
{"temperature":30730,"time":"2017-03-09T02:21:48+0000","id":"1489026108"}
{"temperature":17072,"time":"2017-03-09T02:15:22+0000","id":"1489025722"}
{"temperature":18177,"time":"2017-03-08T21:27:23+0000","id":"1489008443"}
Export complete { iterations: 1, records: 3, time: 0.145 }
```

The tool makes as many API calls as it needs to extract the data, converting the JSON to a more compact form as it goes.

## Importing into CouchDB/Cloudant

I already have a tool to import data into CouchDB: [couchdbimport](https://www.npmjs.com/package/couchdbimport), which you can install in a similar way:

```sh
$ npm install -g couchimport
```

Set an environment variable with your target Cloudant/CouchDB service's URL:

```sh
$ export COUCH_URL="https://MYUSERNAME:MYPASSWORD@MYHOST.cloudant.com"
```

Then run both the `dynamodbexport` and `couchimport` commands together, piping the output of the former into the latter:

```sh
$ dynamodbexport --table iot --region us-east-1 | couchimport --db iot --type jsonl
```

The `--type jsonl` parameter tells couchimport that it is to expect one JSON document per line and `--db iot` defines the name of the target database. (Make sure your target database already exists, since couchimport will not create new databases.)

It's that simple! You can now use Cloudant's awesome [MapReduce](https://console.ng.bluemix.net/docs/services/Cloudant/api/creating_views.html#views-mapreduce-) tools to aggregate the data or [replicate](https://console.ng.bluemix.net/docs/services/Cloudant/api/replication.html#replication) it to other devices.

## It works for local databases too

The *dynamodbexport* tool also works for [local DynamoDB](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) databases. Just leave out the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables, and it will assume a local database. 

Moving data from local DynamoDB to local CouchDB is as simple as:

```sh
$ dynamodbexport --table iot | couchimport --db iot
```

You'll find more details on command-line usage and programmatic access for [dynamodbexport on npm](https://www.npmjs.com/package/dynamodbexport).