---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2016-03-22T09:00:00.000Z
description: For command-line backup
image: /img/dominik-scythe-414905-unsplash.jpg
relcanonical: https://developer.ibm.com/clouddataservices/2016/03/22/simple-couchdb-and-cloudant-backup/
tags:
  - Backup
title: couchbackup
type: blog
url: /2016/03/22/Simple-CouchDB-Cloudant-backup.html
---


How do you back up an Apache CouchDB&trade; or Cloudant database? One solution is to use CouchDB's built-in replication API. Let's say we have a Cloudant database called  **mydata** that we need to back up.

In CouchDB 1.x, backing up an entire database was as simple as locating the database's `.couch` file and copying it somewhere else. With its 2.x release, CouchDB and the Cloudant database shard the data, splitting a single database into pieces and distributing the data across multiple servers. So backing up a database is no longer as simple as copying a single file.

Then how do you back up? This blog post presents 3 options:

* back up to a text file
* replicate via the command-line
* replicate via the Cloudant dashboard

## Back up to a text file

Cloudant has a RESTful HTTP API, so it is easy to create your own tools to interact with the service. I created a command-line tool called [couchbackup](https://www.npmjs.com/package/@cloudant/couchbackup), which you can use to spool an entire database (either CouchDB or Cloudant) to a text file.

![couchbackup](/img/couchbackup.gif)

To install the tool:
 
You must have [Node.js](https://nodejs.org/en/) installed, together with its "npm" package manager. Then follow these steps:

1. Run:

```sh
> npm install -g @cloudant/couchbackup
```

2. Define an environment variable which holds the path of either:

   - your remote Cloudant database:

```sh
> export COUCH_URL="https://myusername:mypassword@myhost.cloudant.com"
```

   - or local CouchDB instance:

```sh
> export COUCH_URL="http://localhost:5984"
```

3. Back up individual databases to their own text files:

```sh
> couchbackup --db mydb > mydb.txt
```

4. If you want to restore data from a backup into an *empty* database, then use the tool `couchrestore` which was also installed with `couchbackup`:

```sh
> cat mydb.txt | couchrestore --db mydb
```

5. To increase the speed of the restore operation you can perform multiple write operations in parallel:

```sh
> cat mydb.txt | couchrestore --db mydb --parallelism 5
```

## Replication via the command-line

Another option is to **replicate** the database to another Cloudant account or to another CouchDB service by issuing an API call to set off a replication task that copies data from the source database to the target database.

Start replication by adding a document into the `_replicator` database; a  document that lists the source and target database, including authentication credentials. You can achieve all of this from the command-line using a single `curl` command:

```sh
> export SOURCE="https://myusername:mypassword@myhost.cloudant.com"
> export TARGET="https://myotherusername:myotherpassword@myotherhost.cloudant.com"
> export JSON="{\"source\":\"$SOURCE/mydata\",\"target\":\"$TARGET/mydata\"}"
> curl -X PUT -H "Content-Type: application/json" -d "$JSON" "$SOURCE/_replicator"
{"id":"0b05156eefc1feca97e48cd6bd000380","_rev":"1-a301b0fbfa8840f3ca936876729e37cc"} 
```

The API returns with a JSON object containing the id of a document, which you can fetch to monitor the status of the replication job:

```sh
> curl "$SOURCE/_replicator/0b05156eefc1feca97e48cd6bd000380"
``` 

If you have Apache CouchDB installed locally and you intend to back up data from a Cloudant cluster, then instruct your local CouchDB installation to perform the replication. Why your local machine?  Because it has visibility to the Cloudant service, but not vice-versa.

```sh
> export SOURCE="https://myusername:mypassword@myhost.cloudant.com"
> export TARGET="https://localhost:5984"
> export JSON="{\"source\":\"$SOURCE/mydata\",\"target\":\"$TARGET/mydata\"}"
> curl -X PUT -H "Content-Type: application/json" -d "$JSON" "$TARGET/_replicator"
{"id":"0b05156eefc1feca97e48cd6bd001976","_rev":"1-ac15e7843682715ccb712fac41169cf5"} 
```

## Replication via the Cloudant dashboard

You can also start and monitor a replication using the web-based user interface of the Cloudant dashboard. 

1. On the left, choose the **Replication** tab,
2. Click **New Replication** 
3. Complete the form and click **Replicate**. 

In the above example, we are replicating a database that lives in the current user's Cloudant account (the "My Databases" tab in the Source Database section) to another Cloudant account (the "Remote Database" tab in the Target Database section). But we could also be in the target account. Use the same form to perform replications between all combinations of local and remote sources and targets.

## The difference between replication and couchbackup

CouchDB/Cloudant replication is a sophisticated sync protocol that ensures all data from the source database is transferred to the target. If the target database already contains some documents, then clashing revisions are stored as [document conflicts](https://cloudant.com/blog/introduction-to-document-conflicts-part-one/). In addition, deleted documents from the source database are also transferred to the target database.

`couchbackup` simply iterates through the `/db/_all_docs` endpoint fetching the "winning revisions" of documents from the source database. Unlike replication, it ignores deleted documents and conflicts from the source database. During the restoration of backed up data, it also assumes that the target database is empty; no conflicting revisions are created. The result of a `couchrestore` operation is a collection of "first revisions" that matches the winning revisions of the source database.

> "Apache", "CouchDB", "Apache CouchDB", and the CouchDB logo are trademarks or registered trademarks of The Apache Software Foundation. All other brands and trademarks are the property of their respective owners.
