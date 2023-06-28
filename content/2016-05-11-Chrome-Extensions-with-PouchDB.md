---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2016-05-11T09:00:00.000Z
description: With PouchDB & Cloudant
image: /img/joe-st-clair-412369-unsplash.jpg
relcanonical: https://developer.ibm.com/clouddataservices/2016/05/11/chrome-extensions-pouchdb/
tags:
  - PouchDB
title: Chrome Extensions
type: blog
url: /2016/05/11/Chrome-Extensions-with-PouchDB.html
---


Google Chrome extensions are small web applications that are downloaded and installed in the user's Chrome browser. They have a minimal user interface, usually a small icon to the right of the URL bar and a pop-down panel, but have additional rights over and above normal websites:

* they can be bundled and submitted to the Chrome Web store as a distribution mechanism
* they have limited access to the host computer to save files, access networking tools and communicate with connected devices
* they have access to the browser's inner workings and can alter the rendering of web pages

Chrome extensions are really just web applications built from HTML, CSS and JavaScript, and we can use the framework of our choice to build them.

When it comes to storing data, the [chrome.storage](https://developer.chrome.com/extensions/storage) API allows your extension to store data, which can be synced between other instances of the extension with the same Google account, such as between your desktop and laptop browsers. If you don't want to use the Google APIs, then you can use your own storage tools such as [PouchDB](https://pouchdb.com/), an in-browser JSON document store that can sync with remote PouchDB, [CouchDB](http://couchdb.apache.org/) or [Cloudant](https://cloudant.com/) databases. 

This post shows two sample Chrome extensions

**linkshare - a very simple bookmarking tool**

![linkshare screenshot](/img/chrome1.png)

**volt - a password database**

![volt screenshot](/img/chrome2.png)

Both apps store their data *locally first* using PouchDB and allow the user to optionally sync the data with a remote server.

## Installing

The samples presented here have not been submitted to the Chrome Web Store, but you can install them from source as long as you enable developer mode. If you subsequently modify the source code on your machine, the changes will be reflected in Chrome the next time you open the extension.

On the command-line, clone the *linkshare* repository:

```sh
> git clone https://github.com/glynnbird/linkshare.git
```

and/or the *volt* repository:

```sh
> git clone https://github.com/glynnbird/volt.git
```

* Visit *chrome://extensions* in your Chrome browser
* Switch on Developer mode
* Click "Load unpacked extension..."
* Navigate to the directory where you clone the git repository
* Repeat for the other extension

Source code:

* https://github.com/glynnbird/linkshare
* https://github.com/glynnbird/volt

[Full installation instructions for non-packaged extensions here](https://developer.chrome.com/extensions/getstarted).

## Creating an Chrome extension from scratch

The life of a Chrome extension begins with a manifest file called "manifest.json":

```js
{
  "manifest_version": 2,
  "name": "Linkshare",
  "description": "A simple link sharing Chrome extension",
  "version": "1.0",
  "browser_action": {
    "default_icon": "linkshare.png",
    "default_popup": "linkshare.html",
    "default_title": "Linkshare"
  },
  "permissions": [
    "activeTab",
    "https://ajax.googleapis.com/"
  ],
  "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'"
}
```

It declares the metadata about the app and which APIs and options it will use. It references a PNG file containing an icon and the HTML page that contains the popup panel. Here's what you need to add:

* an icon file
* a page of HTML
* a JavaScript file (for Chrome extensions, your JavaScript must reside in a separate file, not in the HTML page)

Once installed, you can modify your local files and your installed extension will reflect the changes you make.

## Storing data in a Chrome extension

Using PouchDB couldn't be easier. First of all it needs to be downloaded and referenced in our single-page web app:

```html
<script src="js/pouchdb-5.3.2.min.js"></script>
```

Our page can then create a database and start saving data:

```js
var db = new PouchDB("linkshare");
db.post({a:1,b:2}).then(function(data) {
  console.log("done");
});
```

For debugging, the JavaScript console can be accessed by right-clicking the extension icon and choosing "Inspect popup".

## A simple bookmarking app

Chrome extensions have access to the current tab that is being viewed, so it's simple to create a bookmarking tool that keeps a list of URLs that you want to save permanently, read later or share. By storing such data in PouchDB, we can then optionally sync the data with an Apache CouchDB or IBM Cloudant databases to ensure that there is more than one copy of the data. Furthermore, other users sharing that database can also access the data, allowing the sharing of links with your partner, work colleagues or other ad-hoc groups of people who also have the extension installed.

![schematic](/img/chrome.png)

The JSON schema we will be using is this:

```js
{
  "_id": "123",
  "_rev": "456",
  "url": "http://myfavourite.website.com/is/this/one.html",
  "date": "2016-06-01 12:44:22 Z",
  "title": "My favourite website"
}
```

When a user presses the "Save" button in our extension window, we fetch the page URL and title from the Google Chrome API, add a timestamp and turn the data into a JSON object before storing it in the PouchDB database. PouchDB automatically generates the `_id` and `_rev` fields. These fields are reserved by the database to enforce uniqueness of document IDs and to keep track of any document revisions.

## Loading data on startup

When our Chrome extension is activated, our code fetches a list of documents from the PouchDB database in reverse date order (newest first). We implement this behaviour using the `query` function in _linkshare.js_:

```js
  db.query(map, {include_docs:true, descending:true}).then(function(result) {
    // render the result
  });
```

The `map` function is a MapReduce function that defines the index we wish to create.

```js
var map = function(doc) {
  emit(doc.date, null);
};
```

The map function is called with every document in the collection, and the key/value pairs it emits form the basis of an index we can subsequently interrogate (query). In this case we simply want the data in reverse order (`descending:true`), and we want the whole document bodies back (`include_docs:true`). There's no reduce function in our code because we don't need one. If we needed to aggregate query results, we could use one of PouchDB's built-in reduce functions. See the [PouchDB guide on queries](https://pouchdb.com/guides/queries.html) for more on the built-in reduces for `_count`, `_sum` and `_stats`.

## Syncing with an Apache CouchDB or Cloudant server

PouchDB makes it very simple to sync with a remote server that speaks the CouchDB replication protocol:

```js
  db.sync(url, { live:true, retry:true });
```

This single line of code:

* initiates replication from the client to the server
* initiates replication from the server to the client
* handles reconnection if the connections are interrupted
* streams live changes happening on the client or server to the other party

The URL that our app syncs with is provided by the user in the settings panel of our Chrome extension. e.g

```
   https://myusername:mypassword@myhost.cloudant.com/mydatabase
```

The URL itself is also stored in PouchDB, so it is remembered for the next session. But this value is stored in a [_local document](https://pouchdb.com/guides/local-documents.html), which is a special class of document that resides in the same database as the other bookmark documents, but only in the local copy of the database. "Local" documents are not replicated or indexed.

## Offline-first means always on

Writing data to an in-browser database means that your web application will always work, whether you have a network connection or not. The data is synced to a cloud service too, but the primary mechanism for reading and writing data is the local PouchDB database. So even if remote syncing is impossible, the Chrome extension is always available to store and retrieve data from its local store.

Syncing data also makes sharing it easy. Syncing to a remote copy allows a collection of data to be shared with other users who have access to the same database. All subscribed users will see all the changes when they sync. Coordinating the transfer of data between PouchDB and a cloud-based copy and vice versa is a complex programming task if you were building it yourself, but thanks to PouchDB it's a one-liner!