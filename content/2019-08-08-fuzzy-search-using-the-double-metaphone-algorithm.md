---
author: Brian Wilkins
authorLink: null
date: 2019-08-08T00:00:00.000Z
description: Using the Double Metaphone algorithm to find words that sound alike.
image: /img/john-salvino-Fp7MCwU0etE-unsplash.jpg
relcanonical: null
tags:
  - Double Metaphone
  - views
  - Search
title: Fuzzy search using Double Metaphone
type: blog
url: /2019/08/08/fuzzy-search-using-the-double-metaphone-algorithm.html
---


## Introduction

In an earlier [article]({{< ref "/2018-12-12-soundex-view.md" >}}) I explained how to do a fuzzy search for documents that contain words that sound like some other given word. 
The technique I described there uses a view that implements the Soundex algorithm. The aim of the Soundex algorithm is to encode words alike that sound alike so that they can be matched despite minor differences in spelling.
Soundex was invented before the invention of the electronic computer and is fairly simple. 

A more sophisticated algorithm with a similar purpose is [Double Metaphone](http://www.drdobbs.com/the-double-metaphone-search-algorithm/184401251?pgno=2).
Double Metaphone aims to yield more true matches and fewer false matches. It aims to work for non-English words as well as English words. For any given word it returns up to two different encodings. For example, for `Wagner` it returns `FKNR` for the German pronunciation in which *W* is pronounced as the *v* in *vodka*, and returns `AKNR` for the Anglicized pronunciation in which *W* is pronounced as the *w* in *water*. 

An implementation of the Double Metaphone algorithm in JavaScript is [here](https://github.com/words/double-metaphone/blob/master/index.js).
It is a function called `doubleMetaphone`. It returns an array of two strings, each string being an encoding that represents approximately the pronunciaton of the input string.
With a few minor changes the function can be used in a Cloudant [view](https://cloud.ibm.com/docs/services/Cloudant?topic=cloudant-views-mapreduce) or [search index](https://cloud.ibm.com/docs/services/Cloudant/offerings?topic=cloudant-search).

## Implementing the Double Metaphone algorithm as a view

To turn the [implementation of Double Metaphone](https://github.com/words/double-metaphone/blob/master/index.js) into a Cloudant view Map function that emits values returned by the `doubleMetaphone` function, I removed the line:

```js
module.exports = doubleMetaphone
```
and appended these lines:

```js 
function (doc) {
  emit(doubleMetaphone(doc.name)[0], 1);   
  emit(doubleMetaphone(doc.name)[1], 1);
}
```

See the complete [Cloudant view Map function](https://gist.github.com/brianewilkins/034c203fb29a7e0c7539f6a1ed248949).

## Implementing the Double Metaphone algorithm as a Search index

To turn the [implementation of Double Metaphone](https://github.com/words/double-metaphone/blob/master/index.js) into a Cloudant Search index of values returned by the `doubleMetaphone` function I removed the line:

```js
module.exports = doubleMetaphone
```

and appended these lines:

```js
function (doc) {
  index("name", doc.name);
  index("encoding", doubleMetaphone(doc.name)[0]);
  index("encoding", doubleMetaphone(doc.name)[1]);   
}
```

See the complete [Cloudant Search index function](https://gist.github.com/brianewilkins/0638608ceb248773b6fc456d50e5a37c). The Cloudant Search index must use the [Keyword analyzer](https://cloud.ibm.com/docs/services/Cloudant?topic=cloudant-search#analyzers) so that is input is not tokenized.



## Trying it out

Now let's see how well it does at finding names that are similar to `Smith`.

In the following steps I use the following conventions:

- `$USER` stands for your Cloudant user name;
- `$PASS` stands for password of user $USERNAME;
- `$ACCOUNT` stands for the name of your Cloudant account;
- `$DB` stands for the name of your database.


### Writing some test documents

Write some documents that contain a `name`:

```curl
# Smith
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Smith"}'

# Names like Smith
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Smythe"}'
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Smyth"}'
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Smit"}'
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Schmidt"}'
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Schmitt"}'

# Names unlike Smith
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Jones"}'
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Taylor"}'
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Martinez"}'
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d '{"name": "Wang"}'
```

### Creating the view and search index

The design document `_design/doubleMetaphone` which contains the `doubleMetaphone` view and search index is [ddoc.txt](https://gist.github.com/brianewilkins/6f145b801da0726b77d10e0bc782dfb4).
Write it to the database:

```curl
curl -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB -H "Content-Type: application/json" -d @ddoc.txt
```

### Querying the view to find the Double Metaphone encoding of a name

By querying the view you can find the two Double Metaphone encodings of each name. The Double Metaphone encodings of the name `Smith` are `SM0` and `XMT`.

	$ curl -s -u $USER:$PASS https://$ACCOUNT.cloudant.com/$DB/_design/doubleMetaphone/_view/doubleMetaphone?include_docs=true | jq '.rows[] | select(.doc.name=="Smith") | .key'
	"SM0"
	"XMT"

### Querying the view to find similar sounding names

Now find which names in the database share a Double Metaphone encoding (`SM0` or `XMT`) with `Smith`. 

The view request below returns each name that that shares a Double Metaphone encoding with `Smith`. A name appears twice in the result if both its Double Metaphone encodings match a Double Metaphone encoding of `Smith`.

	$ curl -s -u $USER:$PASS -X POST https://$ACCOUNT.cloudant.com/$DB/_design/doubleMetaphone/_view/doubleMetaphone?include_docs=true -H "Content-Type: application/json" -d '{"keys":["SM0","XMT"]}' | jq '.rows[] | {"Name": .doc.name, "Encoding": .key}'
	{
	  "Name": "Smith",
	  "Encoding": "SM0"
	}
	{
	  "Name": "Smyth",
	  "Encoding": "SM0"
	}
	{
	  "Name": "Smythe",
	  "Encoding": "SM0"
	}
	{
	  "Name": "Schmitt",
	  "Encoding": "XMT"
	}
	{
	  "Name": "Smith",
	  "Encoding": "XMT"
	}
	{
	  "Name": "Smyth",
	  "Encoding": "XMT"
	}
	{
	  "Name": "Schmidt",
	  "Encoding": "XMT"
	}
	{
	  "Name": "Smythe",
	  "Encoding": "XMT"
	}
	{
	  "Name": "Smit",
	  "Encoding": "XMT"
	}

The names `Smith`, `Smyth` and `Smythe` all have as Double Metaphone encodings both `SM0` and `XMT`, so they match `Smith`.

Because the names `Schmidt`, `Schmitt` and `Smit` have the Double Metaphone encoding `XMT`, they match `Smith` too.

### Querying the search index to find similar sounding names

This search request returns all the names in the database that are like (share a Double Metaphone encoding with) `Smith`.


	$ curl -s -u $USER:$PASS "https://$ACCOUNT.cloudant.com/$DB/_design/doubleMetaphone/_search/doubleMetaphone?q=encoding:(SM0%20OR%20XMT)&include_docs=true" | jq .rows[].doc.name
	"Smyth"
	"Smythe"
	"Smith"
	"Schmidt"
	"Schmitt"
	"Smit"


## Conclusion

The Double Metaphone algorithm has identified all the names in the database that are like `Smith`.

It won't always find all words that sound similar to a given word though.
Out of twenty-eight [widely differing alternative spellings](https://gist.github.com/brianewilkins/e14c4519c85ba751ef67257fc6dec34a) of the name of the Russian composer `Tchaikovsky`, ten have a Double Metaphone encoding that matches `Tchaikovsky`.
So it's not perfect. As it is a somewhat subjective judgment which words are similar enough to count as a match, and spellings of the same name can vary a lot, it is hard to see how it could ever be.