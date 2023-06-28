---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2018-06-25T06:00:00.000Z
description: Querying in Node.js
image: /img/fancycrave-584270-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/cloudant-fundamentals-querying-in-node-js-6f6453289f15
tags:
  - Fundamentals
  - Query
title: Cloudant Fundamentals 8/10
type: blog
url: /2018/06/25/Cloudant-Fundamentals-Querying-in-Nodejs.html
---



In the previous part of this series we discovered the `_find` endpoint which allows us to formulate queries in JSON and ask Cloudant to answer them.

In this post, we'll look to doing the same thing but using Node.js code. Again we'll lean on the [cloudant-quickstart](https://www.npmjs.com/package/cloudant-quickstart) library.

## Making queries

Using the query we made last time, we can pass the `selector` directly to the  `query` function of *cloudant-quickstart* object to get an array of matching documents back.

```js
var q = {
  "dob": {
    "$lt": "1970-01-01"
  }
}

db.query(q).then(console.log)
// outputs an array of documents
```

We can do the same queries with additional clauses: 

```js
var q = {
  "$and": [
    {
      "dob": {
        "$lt": "1970-01-01"
      }
    },
    {
      "actor": "Marlon Brando"
    }
  ]
}
db.query(q).then(console.log)
// outputs an array of documents
```

## Sorting

If we need to sort, we can pass the sort options in as a second parameter:

```js
var q = {
  "$and": [
    {
      "dob": {
        "$lt": "1970-01-01"
      }
    },
    {
      "actor": "Marlon Brando"
    }
  ]
}
db.query(q, { sort: { 'date': 'asc'} }).then(console.log)
// outputs an a sorted array of documents
```

## SQL too

If you prefer to express your queries in Structured Query Language (SQL), then the *cloudant-quickstart* library can understand that too:

```js
var q = "SELECT * from newdb WHERE dob < '1970-01-01' AND actor = 'Marlon Brando' SORY BY date"
db.query(q).then(console.log)
```

The *cloudant-quickstart* converts your SQL into the equivalent Cloudant Query object for you. You can see the object by calling the `explain` function:

```js
console.log(db.explain(q))
// { selector: { "$and": [ { "dob":  { "$lt": "1970-01-01" },  { "actor": "Marlon Brando" } ] }, sort: { 'date': 'asc'} }
```

To be clear, this SQL-to-query conversion only works for non-aggregating SELECT queries, but it is useful way to express your query and to understand what the equivalent Cloudant Query looks like.

## Next time

Querying is only one half of the story. In order to have your queries run efficiently, your database needs its data *indexing* too. We'll see what that means in the next installment.

