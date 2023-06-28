---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-07-18T09:00:00.000Z
description: Converting SQL to Cloudant Query JSON
image: /img/h-e-n-g-s-t-r-e-a-m-508476-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/querying-your-cloudant-database-with-sql-bd670ee86291
tags:
  - SQL
  - Query
title: Querying Cloudant with SQL
type: blog
url: /2017/07/18/Querying-Cloudant-with-SQL.html
---


Cloudant and its Apache CouchDB stable-mate are "NoSQL" databases&mdash;that is, they are schemaless JSON document stores. Unlike a traditional relational database, you don't need to define your schema before writing data to the database. Just post your JSON to the database and change your mind as often as you like!

One of the appealing things about relational databases is the query language. [Structured Query Language or SQL](https://en.wikipedia.org/wiki/SQL) was developed by IBM in the 1970s and was widely adopted across a host of databases ever since. In its simplest form, SQL reads like a sentence:

```sql
SELECT name, colour, price 
	FROM animals
	WHERE type='cat' OR (price > 500 AND price < 1000) 
	LIMIT 50
```
 
This statement translates to:

> "Fetch me the name, colour and price from the animals database, but only the records that are cats, or ones which are more expensive than 500 but cheaper than 1000. And I only want a maximum of 50 records returned."

It is a convenient way of expressing the fields you want to fetch, the filter you wish to apply to the data, and the maximum number of records you want in reply.

![sorting]({{< param "image" >}})
> Photo by [H E N G S T R E A M](https://unsplash.com/photos/pjJdOE2XBRU) on Unsplash

Unfortunately, NoSQL databases don't generally support the SQL language. Cloudant and Apache CouchDB™ have their own form of query language where the query is expressed as a JSON object: "[Cloudant Query](https://console.bluemix.net/docs/services/Cloudant/api/cloudant_query.html#query)" (CQ) and "[Mango](https://blog.couchdb.org/2016/08/03/feature-mango-query/)," in their respective contexts. The CQ or Mango equivalent of the above SQL statement is:

```js
	{
	 "fields": [
	  "name",
	  "colour",
	  "price"
	 ],
	 "selector": {
	  "$or": [
	   {
	    "type": {
	     "$eq": "cat"
	    }
	   },
	   {
	    "$and": [
	     {
	      "price": {
	       "$gt": 500
	      }
	     },
	     {
	      "price": {
	       "$lt": 1000
	      }
	     }
	    ]
	   }
	  ]
	 },
	 "limit": 50
	}
```

It's a world of curly brackets! If you're happier expressing your query in SQL, then there is a way.

## cloudant-quickstart + SQL

The latest version of the [cloudant-quickstart](https://www.npmjs.com/package/cloudant-quickstart) Node.js library can now accept SQL queries. It will convert the SQL into a Cloudant Query and deliver the results.

Simply install the `cloudant-quickstart` library:

```sh
npm install -s cloudant-quickstart
```
    
And add it to your Node.js app by passing your Cloudant URL to the library:

```js
  var db = require('cloudant-quickstart')('https://USER:PASS@HOST.cloudant.com/DATABASE');
```

We can then start querying our database with an SQL statement:

```js
  db.query('SELECT name FROM mydb').then(function(data) {
    // data!
  });
```

Here are some other sample queries:

```sql
// fetch all fields
SELECT * FROM mydb

// fetch selected fields
SELECT name, colour, price FROM mydb

// fetch data with WHERE clause
SELECT name FROM mydb WHERE colour = 'tabby'

// fetch data with a more complex WHERE clause
SELECT name FROM mydb WHERE type!='cat' OR (price > 500 AND price < 1000) 

// limit the number of items returned
SELECT name FROM mydb LIMIT 10

// limit the number of items and skip records
SELECT name FROM mydb LIMIT 20,10

// ordering ascending
SELECT name FROM mydb ORDER BY price

// ordering descending
SELECT name FROM mydb ORDER BY price DESC

// multiple field ordering descending
SELECT name FROM mydb ORDER BY type,price

// all together
SELECT name,colour,price FROM mydb WHERE type!='cat' OR (price > 500 AND price < 1000) ORDER BY type, price LIMIT 20,10
```

`cloudant-quickstart` achieves this by converting your SQL query into the equivalent Cloudant Query object. If you'd like to see that data yourself, then call the `explain` function instead of `query` to be returned by the query that would have been used:

```js
var q = db.explain("SELECT name FROM mydb WHERE type!='cat' OR (price > 500 AND price < 1000)");
console.log(JSON.stringify(q));
// {"fields":["name"],"selector":{"$or":[{"type":{"$ne":"cat"}},{"$and":[{"price":{"$gt":500}},{"price":{"$lt":1000}}]}]}}
```

## Limitations

Before we get carried away, this feature doesn't suddenly make Cloudant support joins, unions, transactions, stored procedures etc. It's just a translation from [SQL to Cloudant Query](https://github.com/ibm-watson-data-lab/sqltomango). 

It doesn't support aggregations or grouping either, but you can use `cloudant-quickstart`'s `count`, `sum`, and `stats` functions to generate performant grouped aggregation without any fuss.

This feature simply makes it easier to explore data sets if you already have SQL language experience.


