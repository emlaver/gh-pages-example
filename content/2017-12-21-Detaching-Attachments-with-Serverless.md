---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-12-21T09:00:00.000Z
description: Using Cloud Functions and Object Storage
image: /img/pablo-heimplatz-243286-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/detaching-cloudant-attachments-to-object-storage-with-serverless-functions-99b8c3c77925
tags:
  - Attachments
  - Serverless
title: Detaching attachments
type: blog
url: /2017/12/21/Detaching-Attachments-with-Serverless.html
---


Imagine we have an app that collects geo-coded photographs. We give the app to thousands of students and ask them to collect pictures of storefronts, together with the company name and data from the phone's GPS. Using the latitude and longitude, the company name, and the photograph we intend to crowd-source a business directory.

Our app is based on [Offline First](http://offlinefirst.org/) design principles. It stores its data locally on the mobile device, syncing to the cloud when there is a decent connection. This means our intrepid data collectors need not worry about mobile data charges or visiting areas without cellular coverage&mdash;they can still store their data on their smartphones and upload it later.

We can use [PouchDB](https://pouchdb.com/) for web apps or the [Cloudant Sync](https://www.ibm.com/analytics/us/en/technology/offline-first/) library for native mobile apps on the client side, and use the IBM Cloudant database service on the server side. This gives us the mobile-to-cloud replication of the business data, including storing the photographs as binary [attachments](https://console.bluemix.net/docs/services/Cloudant/api/attachments.html#attachments).

## Why detach attachments?

Storing binary attachments in a NoSQL document database is handy, but it's not best-practice in the long term. It's a useful means of storing binary data, especially on the client side when there's no network connectivity. In the long term, however, object storage is a natural choice to provide a limitless store of files and is much cheaper than a database per GB of binary data.

We can implement a best-of-both-worlds approach by storing attachments in the database _initially_, but detaching them later by moving them to object storage as data reaches the cloud.

## How does it work?

We need to monitor our Cloudant database's changes feed, and as each document is updated we need to move any attachments from the document to object storage.

Initially, our database documents might look like this:

```js
{
  "_id": "7",
  "_rev": "2-920d8da7eb1a1175fcbc10cf6f989d99",
  "title": "Whole Foods",
  "latitude": 54.5107,
  "longitude": -0.1383,
  "_attachments": {
    "storefront.jpg": {
      "content_type": "image/jpeg",
      "revpos": 2,
      "digest": "md5-N0JXExRZxZaOD3sszjMXzA==",
      "length": 46998,
      "stub": true
    }
  }
}
```

Here, attachments are referenced in the `_attachments` object. In this case we have a single attachment called `storefront.jpg`. After moving the document to object storage our document looks like this:
  
```js
{
  "_id": "7",
  "_rev": "3-c3272191e6e94d3bd2a3d72145c7d4fd",
  "title": "Whole Foods",
  "latitude": 54.5107,
  "longitude": -0.1383,
  "attachments": {
    "storefront.jpg": {
      "content_type": "image/jpeg",
      "revpos": 2,
      "digest": "md5-N0JXExRZxZaOD3sszjMXzA==",
      "length": 46998,
      "stub": true,
      "Location": "https://detacher.s3.eu-west-2.amazonaws.com/7-storefront.jpg",
      "Key": "7-storefront.jpg"
    }
  }
}
```

There are several points to note:

- The `_rev` field has changed because we have written a new version of the document.
- The `_attachments` object is gone. Cloudant is no longer storing the attachment.
- There is a new `attachments` object with almost identical data, except that it contains a reference to a `Location` (the URL describing where the attachment is stored in Object Storage) and a `Key` (a concatenation of the document id and the original filename).

The code to do this runs on [IBM Cloud Functions](https://www.ibm.com/cloud-computing/bluemix/openwhisk), IBM's serverless platform which is based on Apache OpenWhisk. A tiny piece of Node.js code is deployed to IBM Cloud Functions and configured to run against every change that occurs in the Cloudant database. 

![schematic](/img/detacher-schematic.png)

In pseudocode, this is what it does:

```
Load the document by its _id
IF the document contains an _attachments key THEN
   FOR each _attachment
     write the attachment to object storage
   END FOR
   remove the documents _attachments key
   replace it with a new attachements object
   save a new version of the document back to Cloudant
END IF
```

## How do I deploy this myself?

You'll need a Cloudant account with a database in it, the [IBM Cloud Functions command-line tool](https://console.bluemix.net/docs/cli/reference/bluemix_cli/get_started.html#getting-started) installed, and an object storage bucket in [IBM Cloud Object Storage](https://www.ibm.com/cloud-computing/products/storage/object-storage/) or [Amazon S3](https://aws.amazon.com/s3/).

Simply [clone my detacher source code](https://github.com/ibm-watson-data-lab/detacher), set your service credentials as environment variables, and run my deploy script:

```sh
export CLOUDANT_HOST="myhost.cloudant.com"
export CLOUDANT_USERNAME="myusername"
export CLOUDANT_PASSWORD="mypassword"
export CLOUDANT_DATABASE="mydatabase"
export AWS_ACCESS_KEY_ID="ABC123"
export AWS_SECRET_ACCESS_KEY="XYZ987"
export AWS_BUCKET="mybucket"
export AWS_REGION="eu-west-2"
export AWS_ENDPOINT="https://ec2.eu-west-2.amazonaws.com"
./deploy.sh
```

Now every time you create a document with an attachment, the attached files are automatically moved to your object storage bucket in the blink of an eye.

![demo](/img/attachments.gif)

Check out the [source code](https://github.com/ibm-watson-data-lab/detacher) for yourself, and start giving those document attachments the treatment they deserve!