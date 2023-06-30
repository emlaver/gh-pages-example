---
author: Brian Wilkins
authorLink: null
date: 2018-12-12T00:00:00.000Z
description: Using the soundex algorithm to find words that sound alike.
image: /img/chris-barbalis-1217112-unsplash.jpg
relcanonical: null
tags:
  - soundex
  - views
title: Fuzzy search using soundex
type: blog
url: /2018/12/12/soundex-view.html
---


If you want to find documents in your database that contain a word that sounds like some other word even though it does not have the same spelling  (a homophone), you can use the soundex algorithm.

Soundex is an algorithm for indexing names by how they are pronounced in English.

Its purpose is to encode words that sound alike with the same representation so that they can be matched despite minor differences in spelling. The algorithm is described [here](https://en.wikipedia.org/wiki/Soundex).
 
Here is a Javascript function that implements the soundex algorithm:

```js
var soundex = function (str) {
    // Fold the input string to lower case and split it into its constituent letters.  
    letters = str.toLowerCase().split('');

    // Take off the first letter.
    first_letter = letters.shift();

    // Here are the soundex codes for each letter. 
    // Letters that sound similar have the same soundex code. 
    // Vowels and 'h', 'w' and 'y' are ignored.     
    soundex_letter_codes = {
     a: '', e: '', h: '', i: '', o: '', u: '', w: '', y:'',
     b: 1, f: 1, p: 1, v: 1,
     c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
     d: 3, t: 3,
     l: 4,
     m: 5, n: 5,
     r: 6
    };
 
    
    // Convert the string to its soundex value.
    // The soundex value of the string consists of the first letter followed by 
    // the soundex code of subsequent letters.
    // If two or more letters with the same soundex code are adjacent 
    // only retain one of them.

    soundex_value = 
     // Take the first letter of the word ...
     first_letter + 
     // ... and append the soundex code of each subsequent letter ...
     letters.map(function (letter) { return soundex_letter_codes[letter] })
     // ... but if two or more letters with the same soundex code are adjacent,
     // only retain the first.
            .filter(function (letter_soundex_value, i, a) {
         return ((i === 0) ? 
                 letter_soundex_value !== soundex_letter_codes[first_letter] : 
                 letter_soundex_value !== a[i - 1]
                );
     }).join('');

    // Make the soundex value four characters long 
    // by truncating it or padding it with zeros. 
    // Fold it to upper case.
    soundex_value = (soundex_value + '000').slice(0, 4).toUpperCase(); 


    // Return the soundex value.
    return soundex_value;
};
```

You can call the `soundex` function in the Map function of a view. For example:

```js
function (doc) {
  emit(soundex(doc.name), null);
} 
```

In the example the soundex representation of the `name` field is indexed.

You can of course index the soundex representation of whatever field you choose simply by passing the field as the parameter of the `soundex` function.

`"Smith"` has the soundex value `S530`. So here is an example of using the view to find documents that have a name that sounds like `"Smith"`.

```sh
acurl "https://$ACCOUNTNAME.cloudant.com/$DATABASE/_design/$DDOC/_view/find_name_by_soundex?key=\"S530\"&include_docs=true"
```

That request returns not only documents with the name `"Smith"` but also documents with similar names such as `"Smythe"` or `"Schmidt"`. 

---

Here is the entire view Map function with comments removed.


```js
var soundex = function (str) {
    letters = str.toLowerCase().split('');
    first_letter = letters.shift();

    soundex_letter_codes = {
     a: '', e: '', h: '', i: '', o: '', u: '', w: '', y:'',
     b: 1, f: 1, p: 1, v: 1,
     c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
     d: 3, t: 3,
     l: 4,
     m: 5, n: 5,
     r: 6
    };
 
    soundex_value = 
     first_letter + 
     letters.map(function (letter) { return soundex_letter_codes[letter] })
            .filter(function (letter_soundex_value, i, a) {
         return ((i === 0) ? 
                 letter_soundex_value !== soundex_letter_codes[first_letter] :
                 letter_soundex_value !== a[i - 1]
                );
     }).join('');

    soundex_value = (soundex_value + '000').slice(0, 4).toUpperCase(); 

    return soundex_value;
};

function (doc) {
  emit(soundex(doc.name), null);
} 
```
---
For how to use a different algorithm for fuzzy search with Cloudant, see [Fuzzy search using Double Metaphone]({{< ref "/2019-08-08-fuzzy-search-using-the-double-metaphone-algorithm.md" >}})
