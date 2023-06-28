---
author: Brian Wilkins
authorLink: null
date: 2020-07-17T06:00:00.000Z
description: How to recover a document in Cloudant that has been deleted or overwritten
image: /img/joshua-coleman-Cj8h7-b47ko-unsplash.jpg
relcanonical: null
tags:
  - Compaction
title: How to recover a deleted document
type: blog
url: /2020/07/17/How-to-recover-a-deleted-document.html
---


## Introduction

This article describes how you might be able to recover data in Cloudant after it has been deleted or overwritten.

![image]({{< param "image" >}})

> Photo by [Joshua Coleman on Unsplash](https://unsplash.com/photos/Cj8h7-b47ko)

Deleting a Cloudant document leaves behind a so-called [tombstone](https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-documents#tombstone-documents) - a shell of the original document containing only an `_id`/`_rev` pair and a `_deleted: true` flag. Soon after deletion (or after updating a document), the previous revision's document body is removed in a process called "compaction". This process runs automatically from time to time in the Cloudant service as an essential part of database maintenance. There is however, a short time window between updating/deleting a document and its body being compacted - if you know what you're doing, and you're quick, it's possible to recover the old document body before it is lost forever. 

## Examples

To follow the examples in this section, replace:

- 	`$USER` with the Cloudant account name
- 	`$PASS` with the password of $USER
- 	`$DB` with the name of the database.

### How to recover a document that has been deleted

Here are example steps which demonstrate how you might be able to recover a document after it has been deleted.

1. Write a new document as an example:

	```shell
	curl -u $USER:$PASS -X POST https://$USER.cloudant.com/$DB \
	     -H "Content-Type: application/json" \
	     -d '{   
	             "_id": "example",
	             "data": "Your data here."
	         }'
	```
	The output I got:
	
	    {"ok":true,"id":"example","rev":"1-4a5958602638984def83a2075a86bc7a"}
	
	indicates that the revision of the new document in this example is: `1-4a5958602638984def83a2075a86bc7a`


2. Delete the document: 

	```shell
	curl -u $USER:$PASS -X DELETE https://$USER.cloudant.com/$DB/example?rev=1-4a5958602638984def83a2075a86bc7a
	```
	The output I got:
	
		{"ok":true,"id":"example","rev":"2-45a4676f3cae54b3e7346d3a09dda771"}
	
	indicates that the new revision of the (now deleted) document in this example is: `2-45a4676f3cae54b3e7346d3a09dda771`


3. These command outputs confirm that the document is now deleted:
	
	```
	$ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example | jq .
	{
	  "error": "not_found",
	  "reason": "deleted"
	}

	$ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example?deleted=true | jq .
	{
	  "_id": "example",
	  "_rev": "2-45a4676f3cae54b3e7346d3a09dda771",
	  "_deleted": true
	}
	```

4. This command uses the `revs_info=true` parameter to get the status of the document revisions:

	```
	$ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example?deleted=true\&revs_info=true | jq .
	```
	
	Here is the output I got:
	
	```	
	{
	  "_id": "example",
	  "_rev": "2-45a4676f3cae54b3e7346d3a09dda771",
	  "_deleted": true,
	  "_revs_info": [
	    {
	      "rev": "2-45a4676f3cae54b3e7346d3a09dda771",
	      "status": "deleted"
	    },
	    {
	      "rev": "1-4a5958602638984def83a2075a86bc7a",
	      "status": "available"
	    }
	  ]
	}
	```
	
	It shows that the revision which immediately precedes the deleted revision is `1-4a5958602638984def83a2075a86bc7a`.<br>
	Because compaction of this document has not yet run since the document was deleted, revision `1-4a5958602638984def83a2075a86bc7a` has status `"available"`. If that revision were no longer available, its status would be `"missing"`.
	

5. If its status is `"available"` you can still get the contents of revision `1-4a5958602638984def83a2075a86bc7a`:

	```
	$ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example?rev=1-4a5958602638984def83a2075a86bc7a | jq .
	{
	  "_id": "example",
	  "_rev": "1-4a5958602638984def83a2075a86bc7a",
	  "data": "Your data here."
	}
	```

6. Now you can write the contents of the revision back just as it was before the document was deleted. Do not include the `_rev` field.
	
	```shell
	curl -u $USER:$PASS -X POST https://$USER.cloudant.com/$DB \
	     -H "Content-Type: application/json"  \
	     -d '{
	             "_id": "example",
	             "data": "Your data here." 
	         }'
	```
	
	The output I got:

	```
	{"ok":true,"id":"example","rev":"3-a95d2245a9f11e5fa62390c600204d18"}     
	```

	indicates that the new revision in this example is: `3-a95d2245a9f11e5fa62390c600204d18     `

7. This command confirms that the document is now live (not deleted):

	```
	$ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example | jq .
	{
	  "_id": "example",
	  "_rev": "3-a95d2245a9f11e5fa62390c600204d18",
	  "data": "Your data here."
	}
	```	
	
### How to recover a document that has been overwritten

Here are example steps which demonstrate how you might be able to recover the original data after a document has been updated.

1. Update the example document, replacing the original data with new data.

	```shell
    curl -u $USER:$PASS -X POST https://$USER.cloudant.com/$DB \
            -H "Content-Type: application/json" \
            -d '{   
                    "_id": "example",
                    "_rev": "3-a95d2245a9f11e5fa62390c600204d18",
                    "data": "New data that replaces the original data."
                }'
	```
	The output I got:
	
        {"ok":true,"id":"example","rev":"4-9515f5aa01411766cc8aed181af12c1c"}
	
	indicates that the new document revision in this example is: `4-9515f5aa01411766cc8aed181af12c1c`

2. This command confirms that the original data in the document has been replaced by the new data:

    ```
    $ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example | jq .
	{
	  "_id": "example",
	  "_rev": "4-9515f5aa01411766cc8aed181af12c1c",
	  "data": "New data that replaces the original data."
	}

    ```

3. This command uses the `revs_info=true` parameter to get the status of the document revisions now:

	```
	$ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example?revs_info=true | jq .
	```
	
	Here is the output I got:
	
	```	
    {
	  "_id": "example",
	  "_rev": "4-9515f5aa01411766cc8aed181af12c1c",
	  "data": "New data that replaces the original data.",
	  "_revs_info": [
	    {
	      "rev": "4-9515f5aa01411766cc8aed181af12c1c",
	      "status": "available"
	    },
	    {
	      "rev": "3-a95d2245a9f11e5fa62390c600204d18",
	      "status": "available"
	    },
	    {
	      "rev": "2-45a4676f3cae54b3e7346d3a09dda771",
	      "status": "deleted"
	    },
	    {
	      "rev": "1-4a5958602638984def83a2075a86bc7a",
	      "status": "available"
	    }
	  ]
	}
	```
	
	It shows that the revision which immediately precedes the latest revision is `3-a95d2245a9f11e5fa62390c600204d18`.<br>
	Because compaction of this document has not yet run since the document was updated, revision `3-a95d2245a9f11e5fa62390c600204d18` has status `"available"`. If that revision were no longer available, its status would be `"missing"`.
	

4. If its status is `"available"` you can still get the contents of revision `3-a95d2245a9f11e5fa62390c600204d18`:

	```
	$ curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example?rev=3-a95d2245a9f11e5fa62390c600204d18 | jq .
	{
	  "_id": "example",
	  "_rev": "3-a95d2245a9f11e5fa62390c600204d18",
	  "data": "Your data here."
	}
	```

5. Now you can write the contents of the revision back just as it was before the document was updated. This time you must include the latest `_rev` in the document you write.
	
	```shell
	curl -u $USER:$PASS -X POST https://$USER.cloudant.com/$DB \
	     -H "Content-Type: application/json"  \
	     -d '{
	             "_id": "example",
	             "_rev": "4-9515f5aa01411766cc8aed181af12c1c",
	             "data": "Your data here." 
	         }'
	```
	
	The output I got:

	```
    {"ok":true,"id":"example","rev":"5-0bdac581d633b76a696c2b4b3972c87d"}
	```

	indicates that the new revision in this example is: `5-0bdac581d633b76a696c2b4b3972c87d`     `

6. This command confirms that the document now contains the original data, as it was before it was updated:

	```
	curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/example | jq .
	{
	  "_id": "example",
	  "_rev": "5-0bdac581d633b76a696c2b4b3972c87d",
	  "data": "Your data here."
	}
	```	

### How to find what documents have been deleted or overwritten
To find out what document ids have been deleted or overwritten, you can use the [changes feed](https://cloud.ibm.com/docs/services/Cloudant?topic=cloudant-databases#get-changes), which returns a list of changes that have been made to documents in the database, including insertions, updates, and deletions.


For example:

```shell
curl -s -u $USER:$PASS https://$USER.cloudant.com/$DB/_changes
``` 	