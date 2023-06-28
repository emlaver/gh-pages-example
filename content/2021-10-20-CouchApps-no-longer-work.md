---
author: Glynn Bird
authorLink: https://glynnbird.com
date: 2021-10-20T00:00:00.000Z
description: A new HTTP header makes CouchApps inoperable.
image: /img/jose-fontano-pZld9PiPDno-unsplash.jpg
tags:
  - CouchApp
  - Static
title: CouchApps No Longer Work
type: blog
url: /2021/10/20/CouchApps-no-longer-work.html
---


Cloudant mainly stores JSON documents in collections called _databases_, but Cloudant also has the ability to store [attachments](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-attachments) in Cloudant documents. An attachment is a binary blob of data with a file name and mime type. It could be a PDF, a JPG or a Word document.

Some users employed attachments to store HTML, CSS, JavaScript files and other assets in the database so that it could be used as a webserver - applications following this pattern were known as [CouchApps](https://github.com/couchapp/couchapp). CouchApps deployed the website and the database _in the same web domain_, allowing client-side JavaScript to make calls back to the server to add, update and delete documents without having to worry about [cross-origin security restrictions](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

![locked]({{< param "image" >}})
> Photo by [Jose Fontano on Unsplash](https://unsplash.com/photos/pZld9PiPDno)

## Cloudant no longer permits CouchApp scripts

As of October 2021, CouchApps using JavaScript will become inoperable on Cloudant. Fetched attachments will be served out with an additional header: `Content-Security-Policy: sandbox`. This header instructs the browser to prevent script execution on such attachments, so any JavaScript (whether in `.js` files or in `<script>` tags) will be barred from execution on the client machine.

Only Javascript-free CouchApps will continue to operate.

The reason for this change is to close a [security loophole](https://docs.couchdb.org/en/stable/cve/2021-38295.html) which could lead to privilege escalation and malicious data access.

## Regular attachments will continue to work

Regular document attachments will continue to work as normal, the only difference being the addition of the `Content-Security-Policy` header on attachment retrieval which should not affect normal operation.

## Alternatives to CouchApps

Static websites have become very popular in recent years and there many better places for hosting static content than in a database:

- [GitHub Pages](https://pages.github.com/) allows files in a git repository to be served out on the web, with custom domain name an HTTPS support for free.
- [Netlify](https://www.netlify.com/) offers a similar git-based workflow to GitHub Pages but adds the ability to add serverless functions into the mix.
- or, [any number of website hosting offerrings](https://www.ibm.com/uk-en/cloud/hosting/web-hosting).

Any of the above solutions will mean that the website and database server will reside on _different domain names_ and by default, a web page may only access resources on the domain it was served out from. This will mean that web requests originating from web page's JavaScript, targeting a Cloudant service would not be permitted (by the web browser). 

Cloudant can be configured to permit cross-domain requests by enabling CORS [in the Cloudant Dashboard](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-cors#dashboard): you may choose to allow requests from any domain, or to a list of specified domains.

The combination of a static hosting service and Cloudant with CORS enabled, should allow CouchApp-like functionality to be reproduced.
