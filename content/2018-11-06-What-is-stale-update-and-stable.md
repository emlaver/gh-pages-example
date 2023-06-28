---
author: Mike Rhodes
authorLink: https://dx13.co.uk/
date: 2018-11-06T00:00:00.000Z
description: Triggering indexing and permitting stale queries
image: /img/marifer-705093-unsplash.jpg
relcanonical: https://dx13.co.uk/articles/2018/11/6/Cloudant-what-is-stale-stable-update.html
tags:
  - indexing
  - querying
title: Stale, update and stable
type: blog
url: /2018/11/06/What-is-stale-update-and-stable.html
---


**tl;dr** If you are using `stale=ok` in queries to Cloudant or CouchDB 2.x, you
most likely want to be using `update=false` instead. If you are using
`stale=update_after`, use `update=lazy` instead.

This question has come up a few times, so here's a reference to what the
situation is with these parameters to query requests in [Cloudant][c] and
[CouchDB][couch] 2.x.

CouchDB originally used `stale=ok` on the query string to specify that you were
okay with receiving out-of-date results. By default, CouchDB lazily updates
indexes upon querying them rather than when JSON data is changed or added. If up
to date results are not strictly required, using `stale=ok` provides a latency
improvement for queries as the request does not have to wait for indexes to be
updated before returning results. This is particularly useful for databases with
a high write rate.

As an aside, Cloudant automatically enqueues indexes for update when primary
data changes, so this problem isn't so acute. However, in the face of high
update rate bursts, it's still possible for indexing to fall behind so a delay
may occur.

When using a single node, as in CouchDB 1.x, this parameter behaved as you'd
expect. However, when clustering was added to CouchDB, a second meaning was
added to `stale=ok`: also use the same set of shard replicas to retrieve the
results.

Recall that [Cloudant and CouchDB 2.x stores three copies of each shard][1] and
[by default will use the shard replica that starts returning results fastest for
a query request][2]. This latter fact helps even out load across the cluster.
Heavily loaded nodes will likely return slower and so won't be picked to respond
to a given query. When using `stale=ok`, the database will instead always use
the same shard replicas for every request to that index. The use of the same
replica to answer queries has two effects:

1. Using `stale=ok` could drive load unevenly across the nodes in your database
   cluster because certain shard replicas would always be used for the queries
   to the index that specify `stale=ok`. This means a set of nodes could receive
   outside numbers of requests.
2. If one of the replicas was hosted on a heavily loaded node in the cluster,
   this would slow down all queries to that index using `stale=ok`. This is
   compounded by the tendency of `stale=ok` to drive imbalanced load.

The end result is that using `stale=ok` can, counter-intuitively, cause queries
to become slower. Worse, they may become unavailable during cluster split-brain
scenarios because of the forced use of a certain set of replicas. Given that
mostly people use `stale=ok` to improve performance, this wasn't a great state
to be in.

As `stale=ok`'s existing behaviour needed to be maintained for backwards
compatibility, the fix for this problem was to introduce two new query string
parameters were introduced which set each of the two `stale=ok` behaviours
independently:

1. `update=true/false/lazy`: controls whether the index should be up to date
   before the query is executed.
    1. `true`: the index will be updated first.
    2. `false`: the index will not be updated.
    3. `lazy`: the index will not be updated before the query, but enqueued for
       update after the query is completed.
2. `stable=true/false`: controls the use of the certain shard replicas.

The main use of `stable=true` is that queries are more likely to appear to "go
forward in time" because each [shard replica may update its indexes in different
orders][2]. However, this isn't guaranteed, so the availability and performance
trade offs are likely not worth it.

The end result is that virtually all applications using `stale=ok` should move
to instead use `update=false`.

[1]: /2015/10/19/Read-Write-Behaviour-in-a-cluster.html
[2]: /2016/01/31/Understanding-Cloudant-Indexing.html
[c]: https://www.ibm.com/cloud/cloudant
[couch]: https://couchdb.apache.org/