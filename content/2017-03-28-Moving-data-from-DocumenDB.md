---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-03-28T09:00:00.000Z
description: Using the documentdbexport npm module
image: /img/documentdb.png
relcanonical: https://medium.com/ibm-watson-data-lab/moving-data-from-documentdb-to-cloudant-or-couchdb-6c3d16414fc6
tags:
  - DocumentDB
title: Moving data from DocumentDB
type: blog
url: /2017/03/28/Moving-data-from-DocumenDB.html
---


In this article we're going to look at extracting data from Microsoft Azure's DocumentDB service and then importing the data into IBM Cloudant.

![documentdb]({{< param "image" >}})

## Getting the data out

Once again, I've written a script to do this for you: [documentdbexport](https://www.npmjs.com/package/documentdbexport).

First, install the tool:

```sh
$ npm install -g documentdbexport
```

Define a couple of environment variables with your Azure credentials:

```sh
$ export AZURE_ENDPOINT="https://mydocumentdb.documents.azure.com:443/"
$ export AZURE_KEY="GeIZysnonvgpk2"
```

Then, simply run *documentdbexport*, supplying the name of the database and collection to export:

```sh
$ documentdbexport --database iot --collection temperaturereadings
{"temperature":30730,"time":"2017-03-09T02:21:48+0000","id":"1489026108"}
{"temperature":17072,"time":"2017-03-09T02:15:22+0000","id":"1489025722"}
{"temperature":18177,"time":"2017-03-08T21:27:23+0000","id":"1489008443"}
Export complete { records: 3, time: 0.145 }
```

The tool makes as many API calls as it needs to extract the data, converting the JSON to a more compact form as it goes.

## Importing into CouchDB/Cloudant

We can use [couchdbimport](https://www.npmjs.com/package/couchdbimport) to do the import stage for us. Install it with:

```sh
$ npm install -g couchimport
```

Set an environment variable with your target Cloudant/CouchDB service's URL:

```sh
$ export COUCH_URL="https://MYUSERNAME:MYPASSWORD@MYHOST.cloudant.com"
```

Then, run both the `documentdbexport ` and `couchimport` commands together, piping the output of the former into the latter:

```sh
$ documentdbexport --database iot --collection temperaturereadings | couchimport --db iot --type jsonl
```

The `--type jsonl` parameter tells couchimport that it is to expect one JSON document per line and `--db iot` defines the name of the target database.

It's that simple! You’ll find more details on command-line usage and programmatic access for [documentdbexport on npm](https://www.npmjs.com/package/documentdbexport). 
