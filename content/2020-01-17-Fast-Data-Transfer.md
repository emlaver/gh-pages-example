---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2020-01-17T06:00:00.000Z
description: Copying data faster than replication
image: /img/juliana-kozoski-X3-IypGOGSE-unsplash.jpg
tags:
  - Replication
  - Transfer
title: Fast Data Transfer
type: blog
url: /2020/01/17/Fast-Data-Transfer.html
---


Cloudant replication is the database's method of of choice for transferring data from a _source_ to a _target_ database. It's main use-cases are:

- Mobile apps - keeping mobile application data synched with a server-side copy where the data can be modified at both sides.
- Cross-region sync - a database can exist in two geographies and traffic can be load balanced between them, routed so that a customer is directed to their nearest copy or can be used for disaster recovery fail-over.
- One-off data transfer - if data needs to be moved from one CouchDB/Cloudant service to another.
- Removing tombstones - deleted Cloudant documents leave a "tombstone" document behind which can't be deleted without replicating data to a new database and ignoring the deletions.
- Backup - taking a copy of valuable data: in some cases only the data and not the design documents that trigger index builds need to be retained.

Replication is easy to set up, can be run as a one-off or continuous operation and can be resumed from its last position. For all of its good points, replication does have some drawbacks:

- Conflict removal - any [conflicted documents]({{< ref "/2018-07-25-Removing-Conflicts.md" >}}) on the source are carefully retained on the target side.
- Document alteration - the documents can not be changed in flight. If, for example, you wish to replicate data from a non-partitioned database to a partitioned database, altering the `_id` field on the way, this cannot be achieved with replication.
- Speed - replication's focus on transferring everything from the source to the target (winning revisions, conflicts, deletions and attachments) makes it precise but not as fast as simple data transfer could be.

![fire hose]({{< param "image" >}})
> Photo by [Juliana Kozoski on Unsplash](https://unsplash.com/photos/X3-IypGOGSE)

## How fast is replication?

It depends how many documents you have, how big they are, how many of them are conflicted, how many attachments there are, how big _they_ are, how many deletions you have, the reads-per-second capacity at the source, the writes-per-second capacity at the target, network bandwidth, how geographically close the source and target are etc.

As an indicative example, I was able to transfer 500,000 documents (around 700 bytes each) in around 300 seconds. This number is highly dependent on the provisioned capacity of the Cloudant service you have. A free "Lite" account, for example,  can only transfer 20 documents per second because it is rate-limited to 20 reads per second. 

If we're prepared to make some assumptions and drop some of replication's features, we can achieve a faster data transfer than that using _couchfirehose_, a command-line utility that transfers data from a source to a target database without using replication.

## How do I install couchfirehose?

Simply run:

```sh
> npm install -g couchfirehose
```

## How do a I transfer data using couchfirehose?

Let's set up our Cloudant URL, including authentication credentials, in an environment variable:

```sh
> export URL="https://myusername:mypassword@mycloudantservice.cloudant.com"
```

We can then use the `URL` variable in our next command:

```sh
> couchfirehose --source "$URL/mysourcedb" --target "$URL/mytargetdb"
```

As well as `--source` and `--target` there are other parameters we can use to customise the data transfer:

- `--source`/`-s` - the URL of the source Cloudant database, including authentication.
- `--target`/`-t` - the URL of the target Cloudant database, including authentication.
- `--batchsize`/`-b` - the number of documents per write request. (Default 500)
- `--concurrency`/`-c` - the number of writes in flight. (Default 2)
- `--maxwrites`/`-m` - the maximum number of write requests to issue per second. (Default 5)
- `--filterdesigndocs`/`--fdd` - whether to omit design documents from the data transfer. (Default false)
- `--filterdeletions`/`--fd` - whether to omit deleted documents from the data transfer. (Default false)
- `--resetrev`/`-r` - omits the revision token, resetting the targets revisions to `1-xxx'. (Default false)
- `--transform` - the path of synchronous JavaScript transformation function. (Default null)
- `--selector` - a selector query used to filter the source's documents. (Default null)

e.g.

```sh
> # filter out deleted documents
> couchfirehose --source "$URL/mysourcedb" --target "$URL/mytargetdb" --fd true
> # larger batch size
> couchfirehose --source "$URL/mysourcedb" --target "$URL/mytargetdb" -b 2000
> # ensure that only five writes are made per second
> couchfirehose --source "$URL/mysourcedb" --target "$URL/mytargetdb" -m 5
> # allow eight writes to be in flight at any one time
> couchfirehose --source "$URL/mysourcedb" --target "$URL/mytargetdb" -c 8
```

By experimenting with these parameters, it's possible to see a four-fold increase in speed compared with replication, all though it's worth remembering that this **is not replication**:

- conflicts, attachments and optionally deletions/design-docs are left behind.
- there maybe unexpected results if the source data is non-static or the target database is not empty.
- the _couchfirehose_ process is not "resumable".

## Advanced features

We don't have to transfer all of the source data to the target if we don't want to. By supplying a [Cloudant Query Selector](https://cloud.ibm.com/docs/services/Cloudant?topic=cloudant-query#selector-syntax) as the `--selector` parameter, the source data will be filtered according to the query e.g.

```sh
> # only transfer completed orders
> couchfirehose --source "$URL/s" --target "$URL/t" --selector '{"status":"completed"}'
> # only transfer last year's data that is not null
> couchfirehose --source "$URL/s" --target "$URL/t" --selector '{"year":2018,"value":{"$ne":null}}'
```

We can also supply a custom JavaScript function to the `--transform` parameter, where the function transforms the source document prior to it being written to the target. Create your function in a file:

```js
module.exports = (doc) => {
  // delete unwanted field
  delete doc.deprecatedAttribute
  // add a new field
  doc.newAttribute = 'new'
  // coerce the type of a field
  if (typeof doc,price === 'string') {
     doc.price = parseFloat(doc.price)
  }
  // modify the _id as we're moving to a partitioned database
  doc,_id = doc.userid + ':' + doc._id
  // ignore zero value transactions
  if (doc.price === 0) {
     // if we return null, the document is not written to the target
     return null
  }
  return doc
}

module.exports = f
```

The _transform_ feature can be used to correct data, add new attributes, remove unwanted attributes and for migrations from a non-partitioned database to a partitioned database, modify the `_id` field to contain a partition key. 
