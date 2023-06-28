---
author: Glynn Bird
authorLink: https://glynnbird.com
date: 2022-01-14T00:00:00.000Z
description: Switching from TXE to Standard
image: /img/julia-craice-faCwTallTC0-unsplash.jpg
tags:
  - Migration
  - TXE
title: Migrating from TXE
type: blog
url: /2022/01/14/Migrating-from-Cloudant-TXE-to-Standard.html
---


In this blog post we'll show how data stored in a Cloudant on Transaction Engine (TXE) instance can be easily migrated to Cloudant Standard. There are few differences betweeen the two offerrings, so we'll explore ways to avoid any pitfalls along the way.

There isn't a way of converting an existing account from TXE to Standard, so the first step is to provision a new Cloudant Standard account.

![migration]({{< param "image" >}})
> Photo by [Julia Craice on Unsplash](https://unsplash.com/photos/faCwTallTC0)

## Create a new Cloudant Standard account

In the IBM Cloud Dashboard, locate the [Cloudant service](https://cloud.ibm.com/catalog/services/cloudant) and complete the form to create a new Cloudant Standard service:

- Choose "Standard" as the plan.
- Pick the same region as your Cloudant TXE service.

> Note Cloudant Standard offers two authentication mechanisms: IAM only, or IAM and Legacy Credentials. TXE only has IAM.

## Create new empty databases

For each of your databases that needs to be copied over, in the new Cloudant Standard dashboard choose "Create Database" and enter the name of the database to create a new, empty target database.

> Note Cloudant Standard has two types of databases: partitioned and non-partitioned. As all of your TXE databases will be non-partitioned, choose the "non-partitioned" option.

We will also need a `_replicator` database in the Cloudant Standard instance which will handle the replication jobs. Follow the same steps to create a new, empty `_replicator` database.

## Replicating the data

Cloudant's replication capabilities can be used to copy the data from the source (Cloudant TXE) to the target (Standard) and it is recommend to use the Standard account to mediate the replication - i.e. we will be sending our replication document to the Standard account and it will "pull" the data from TXE.

![replication plan](/img/migratingtxe1.png)

You'll need a replication document for each of the TXE databases that are to be copied over. Generate the JSON ahead of time and then add a document for each database to the Cloudant Standard account's `_replicator` database:

```js
{
  "_id": "txe_to_standard_orders",
  "source": {
    "url": "https://txe.cloudant.com/orders",
    "auth": {
      "iam": {
        "api_key": "abc123"
      }
    }
  },
  "target": {
    "url": "https://standard.cloudant.com/orders",
    "auth": {
      "iam": {
        "api_key": "def456"
      }
    }
  },
  "continuous": true
}
```

Note:

- The `_id` is a recognisable name so that you can tell one replication job from another.
- The source object contains the URL of the source TXE database and includes an `auth` object which contains an IAM API key that gives at least `Reader` and `Checkpointer` roles against the source.
- The target object contains the URL of the target Standard database and includes an `auth` object which contains an IAM API key that gives at least `Writer` roles against the target.
- The `continuous` flag means that the replication will job will run forever, until the `_replicator` document is deleted. This will allow a smooth transition from TXE to Standard - your app traffic can be switched over without any disruption.

Replication jobs use up the read allocation of the source Cloudant service (TXE) and the write allocation of the target Cloudant service (Standard), so it is advisable to [increase the capacity of your source and target services](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-capacity) during the data copying process.

Once the replication jobs are set up, the [replication jobs can be monitored](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-advanced-replication) using the [_scheduler/docs](https://cloud.ibm.com/apidocs/cloudant#getschedulerdocs) and [_scheduler/jobs](https://cloud.ibm.com/apidocs/cloudant?code=node#getschedulerjobs) endpoints. 

Also bear in mind that once data is copied to the new target databases, any secondary indexes will build. You should monitor the [_active_tasks](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-active-tasks) endpoint to ensure that index building is complete before switching traffic to the new Cloudant service.

> Note if you have a large number of databases, it is advisable to copy databases over in small batches. Copying databases one at a time makes it easier to monitor.

## Differences between TXE and Standard

Before we switch application traffic over to the new Cloudant Standard URL, we need to do some checks to make sure everything is in order. Here are some pitfalls that should be avoided.

### JavaScript versions

Cloudant TXE allows newer (ES6) JavaScript syntax than Cloudant Standard, so it's worth querying each of your secondary indexes to make sure they're returning the data you are expecting. If you are seeing errors, then simplify your JavaScript code: `var` instead of `const`/`let`, simple `for` loops and conditional statements.

> Note that if you modify an index definition, then the secondary index will need to rebuild again.

### Other differences

- Cloudant TXE has its own Pagination API, where as Cloudant Standard has a different set of [parameters for each query method](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-pagination-and-bookmarks).
- The two products have different [pricing models](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-feature-comparison#pricing-feature-compare) so the billing for the same apps running on each would likely be different.
- There are [service limit](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-feature-comparison) differences between the two products. Cloudant Standard is more permissive, so this is unlikely to cause problems.
- Cloudant TXE's changes feed is linearized where as Cloudant Standard's guarantees to give you each change at least once - so duplicates are possible.
- Cloudant TXE does not create in-region conflicts, but they are possible with Cloudant Standard, especially if a document is modified over and over in short time window. See [Best & Worst Practice](https://blog.cloudant.com/2019/11/21/Best-and-Worst-Practices.html) for Cloudant Standard.

