---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2015-10-19T09:00:00.000Z
description: Backup, shell, migration and more
image: /img/cli.png
relcanonical: https://developer.ibm.com/clouddataservices/2015/10/19/command-line-tools-for-cloudant-and-couchdb/
tags:
  - CLI
title: Command-line tools
type: blog
url: /2015/10/19/Command-line-tools-for-Cloudant.html
---


Some developers spend their days dragging and dropping in a graphical user interface, others are more comfortable typing green letters into a black background on a command-line terminal. If you are the latter type of developer, then this blog post is for you. We introduce a range of command-line tools that you can use to interface with [IBM Cloudant](https://cloudant.com/) (or plain [Apache CouchDB](http://couchdb.apache.org/)).

Cloudant and CouchDB share an RESTful HTTP API allowing access from any programming language or from the command-line using the [curl](http://curl.haxx.se/) utility. The packages featured in this blog post are all free to download and open-source, allowing you to fork and modify them for your own purposes.

## ccurl

Most Cloudant & CouchDB developers use [curl](http://curl.haxx.se/) to access the RESTful HTTP API. The trouble with curl is that the commands can get overly long, with lots of repetition between commands, for example:

```sh
curl -X POST -H 'Content-type: application/json' -g "https://myusername:mypassword@myhost.cloudant.com/mydb"
  -d '{"val": "json"}'
```

The utility [ccurl](https://www.npmjs.com/package/ccurl) is a wrapper around [curl](http://curl.haxx.se/) that removes some of the repetition. It adds the following features:

* The protocol, username, password and hostname are not required; instead they are taken from an environment variable.
* The content-type header 
* The ["-g" fix](http://glynnbird.tumblr.com/post/61760654532/making-curl-play-nice-with-couchdb) 


Configuring *ccurl* is a one-off task: simply set your Cloudant or CouchDB URL as the `COUCH_URL` environment variable:

```sh
export COUCH_URL="https://myusername:mypassword@myhost.cloudant.com"
```

or

```sh
export COUCH_URL="http://localhost:5984"
```

*ccurl* makes command-line API requests much less verbose, as these examples show: 

```sh 
# fetch stats about database ‘mydb’
ccurl /mydb

# fetch single document
ccurl /mydb/12345

# add a document
ccurl -X POST -d'{"a":1,"b":2}' /mydb
```

| Name        | Description               | URL                                    | Installation                   |
| ----------- | ------------------------- | -------------------------------------- | ------------------------------ |
| ccurl       | A curl helper for CouchDB | [ccurl](https://www.npmjs.com/package/ccurl)    | `npm install -g ccurl`         |

## jq

Simplify dealing with JSON on the command line by installing the [jq](https://stedolan.github.io/jq/) utility, which parses and filters JSON strings. In this example, *jq* takes the stream of data coming from *ccurl*, and turns it into nicely formatted, coloured terminal output:

```sh
ccurl /mydb/12345 | jq .
```

You can supply arguments to the *jq* command. For example:

```sh
ccurl /mydb/12345 | jq .geometry.coordinates
```

fetches the coordinates from the geometry object included within the JSON object returned by the *ccurl* command. *jq* has its own syntax that allows JSON objects to be filtered, manipulated and queried. See the [jq website](https://stedolan.github.io/jq/) for further details.

| Name        | Description                                | URL                                    | Installation                   |
| ----------- | ------------------------------------------ | -------------------------------------- | ------------------------------ |
| ccurl       | A lightweight command-line JSON processor  | [jq](http://stedolan.github.io/jq/)         | manual                         |

## couchshell

If you’re familiar with the file and directory commands of a Unix shell, then you should find [couchshell](https://www.npmjs.com/package/couchshell) intuitive to use. It presents a Cloudant account or CouchDB installation as a directory tree, with top-level directories being databases, and their contents being documents. It uses the same environment variable as *ccurl* and can be invoked by typing `couchshell`. The result is you find yourself in a shell-like environment, with a `>>` prompt. The environment is optimized for working with Couch and Cloudant commands with "tab autocomplete" of database names and document ids:

![couchshell screenshot](/img/couchshell.png)

The above sequence of commands creates a database, creates two documents, and deletes one of them.

A full list of the couchshell commands is provided on the tool’s [website](https://www.npmjs.com/package/couchshell).

| Name        | Description                                                   | URL                                         | Installation                        |
| ----------- | ------------------------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| couchshell  |  A shell to interact with CouchDB as if it were a file system | [couchimport](https://www.npmjs.com/package/couchshell)    | `npm install -g couchshell`         |

## couchimport

If you have CSV files containing data which you need to upload to Cloudant or CouchDB, then [couchimport](https://www.npmjs.com/package/couchimport) can import the files. The following sequence of shell commands download a dataset containing US crime data, unzip it, creates a new CouchDB database, and finally imports the CSV data by piping the file to the *couchimport*:

```sh
curl 'http://data.octo.dc.gov/feeds/crime_incidents/archive/crime_incidents_2013_CSV.zip' > crime.zip
unzip crime.zip
ccurl -X PUT /crime
cat crime_incidents_2013_CSV.csv | couchimport --db crime --delimiter ","
```

Once again, *couchimport* uses the same `COUCH_URL` environment variable to determine the database to write to. *couchimport* can also be used programmatically to allow your Node.js applications to import CSV files or streams into CouchDB or Cloudant.

| Name        | Description               | URL                                       | Installation                   |
| ----------- | ------------------------- | ----------------------------------------- | ------------------------------ |
| couchimport | A CSV import utility      | [couchimport](https://www.npmjs.com/package/couchimport) | `npm install -g couchimport`   |

## couchbackup

If you need to backup and restore CouchDB data, then [couchbackup](https://www.npmjs.com/package/@cloudant/couchbackup) and [couchrestore](https://www.npmjs.com/package/@cloudant/couchbackup) utilities can help. Backup is as simple as running the *couchbackup*; in this case taking a copy of the `animals` database and saving it to the file `animals.txt`:

```sh
couchbackup --db animals > animals.txt
```

Restoring a backup is the reverse operation - pipe the file to *couchrestore*:

```sh
cat animals.txt | couchrestore --db animals
```

We can compress the data using standard compression utilities:

```sh
couchbackup --db animals | gzip > animals.txt.gz
cat animals.txt.gz | gunzip | couchrestore --db animals
```

*couchbackup* takes a shallow copy of a Cloudant database with only the winning revisions being backed up.

| Name        | Description                  | URL                                       | Installation                   |
| ----------- | ---------------------------- | ----------------------------------------- | ------------------------------ |
| couchbackup | A backup and restore utility | [couchbackup](https://www.npmjs.com/package/couchbackup) | `npm install -g couchbackup`   |

# couchmigrate

When changing a database’s design documents, you need to take care that users of the database don’t suffer performance issues as the new index rebuilds. The [couchmigrate](https://www.npmjs.com/package/couchmigrate) utility creates a new design document, waits for the index to build, and finally makes the index live.

For example, if our new design document is in a file `dd.json`, we could run the following command:

```sh
couchmigrate --dd dd.json --db movies
```

This command blocks use until the views defined in dd.json are ready to use.

| Name         | Description                         | URL                                        | Installation                    |
| ------------ | ----------------------------------- | ------------------------------------------ | ------------------------------- |
| couchmigrate | A design document migration utility | [couchmigrate](https://www.npmjs.com/package/couchmigrate) | `npm install -g couchmigrate`   |



