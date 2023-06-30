---
author: Glynn Bird
authorLink: https://glynnbird.com
date: 2022-08-16T00:00:00.000Z
description: Show/List/Rewrite/Update functions are deprecated
image: /img/hal-gatewood-Vfml26Iy4mI-unsplash.jpg
tags:
  - Deprecation
  - CouchApp
title: CouchApp function deprecation
type: blog
url: /2022/08/16/Show-list-rewrite-udpate-functions-deprecated.html
---


IBM Cloudant, the Database-as-a-Service based on the Apache CouchDB project, is giving notice that the following features are deprecated:

- show functions - used to modify the format of the response when requesting a single document from the database. Show functions are accessed via URLs of the form: `/<db>/_design/<design-doc>/_show/<show-name>/<docid>`. See [CouchDB docs on Show Functions](https://docs.couchdb.org/en/stable/ddocs/ddocs.html#showfun).
- list functions - similar to show functions, but applied to the output of MapReduce views. List functions are accessed via URLs of the form `/<db>/_design/<design-doc>/_list/<list-name>/<view-name>`. See [CouchDB docs on List Functions](https://docs.couchdb.org/en/stable/ddocs/ddocs.html#list-functions).
- rewrite functions - used to embody routing logic in CouchApps. Rewrite functions are accessed via URLs of the form `/<db>/_design/<design-doc>/_rewrite/<path>`. See [CouchDB docs on Rewrite Functions](https://docs.couchdb.org/en/stable/api/ddoc/rewrites.html?highlight=rewrite#db-design-design-doc-rewrite-path).
- update functions - used to carry out business logic within the database e.g. adding a timestamp to all document writes. Update functions are accessed via URLs of the form `/<db>/_design/<design-doc>/_update/<update-name>/<doc-id>`. See [CouchDB docs on Update Functions](https://docs.couchdb.org/en/stable/api/ddoc/render.html?highlight=update%20handler#db-design-design-doc-update-update-name-doc-id)

These four features are already deprecated in Apache CouchDB and scheduled to be removed from the code in CouchDB 4.0. None of these features are exposed in our Cloudant SDKs.

![couch]({{< param "image" >}})
> Photo by [Hal Gatewood on Unsplash](https://unsplash.com/photos/Vfml26Iy4mI)

Although these features are deprecated, they will not be removed from the service yet. We may completely remove this features in due course, but will leave them operable for the time being to give customers time to modify their applications. As deprecated features, they will not appear in our documentation, their use is not recommended and they will not be supported by our Support team.

## Alternatives

Show and List function simply transform single documents and view rows, respectively, within Cloudant before returning data to the client. This functionality can be easily reproduced by transforming Cloudant's usual JSON reponses on the client side.

Rewrite functions are used in CouchApps, where a web application is hosted by Cloudant - CouchApps [were deprecated in October 2021]({{< ref "/2021-10-20-CouchApps-no-longer-work.md" >}}) so application hosting must be undertaken by a separate web server or hosting provider which can perform the routing logic.

Update functions have two main use-cases:

1. Modifying a document prior to writing - this logic can be transferred into client-side application logic instead i.e. if you need a timestamp recording inside every document written, add this field in your client-side logic.
2. Deciding whether a document is written or not - this logic can be implemented on the client side, or as Javascript logic in a [Validate Document Update function (VDU)](https://docs.couchdb.org/en/3.2.2/ddocs/ddocs.html#validate-document-update-functions) - VDU functions have _not_ been deprecated.
