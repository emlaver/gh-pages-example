---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-10-05T09:00:00.000Z
description: Serverless Edition
image: /img/erik-witsoe-364381-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/cloudant-envoy-serverless-edition-d68b08d536d7
tags:
  - Serverless
title: Cloudant Envoy
type: blog
url: /2017/10/05/Cloudant-Envoy-serverless-edition.html
---


[Cloudant Envoy](https://www.npmjs.com/package/cloudant-envoy) is software that sits between mobile users and a Cloudant database. It allows the apps to follow the CouchDB "one-database-per-user" model on mobile devices, while storing the data in a single server-side database. Without Envoy, each mobile user would have their own server-side database, which makes querying data across users very tricky.

![envoy2](/img/envoy-serverless1.png)

Envoy's trick is to act as a proxy, seamlessly modifying the HTTP API calls heading for the Cloudant service:

![envoy3](/img/envoy-serverless2.png)

By handling the subset of the Cloudant API that is required for replication, Envoy becomes indistinguishable from the Cloudant database it is paired with. It invisibly adds data to documents as they are saved and strips it out when data is retrieved. This hidden metadata marks up the ownership of each document so that each mobile user only has access to their own data.

Envoy can be baked into your own app to allow your web application to sync from an in-browser data store, or it can be run as a stand-alone proxy. In either flavour, it can also handle user authentication as described in [this tutorial which shows how to install Facebook authentication](https://medium.com/ibm-watson-data-lab/authentication-for-cloudant-envoy-apps-part-one-e6dba285b0d1). 

Running Envoy all the time is fine, but it means you need to pay for a virtual machine (or two, or three) to be running 24x7 whether users are syncing their data or not. It would be ideal if we could run Envoy in a "serverless" configuration, i.e., to only consume computing resources if there were traffic. It turns out that you can!

## Introducing Envoy serverless

Envoy Serverless is a new way of deploying Cloudant Envoy. Instead of standing up fixed, 24/7 machines, the code is deployed to [Apache OpenWhisk&trade;](https://developer.ibm.com/openwhisk/), which is branded as [Cloud Functions on IBM's Bluemix platform](https://console.bluemix.net/openwhisk/). Incoming API calls are handled by OpenWhisk as they arrive, scaling up to meet with the demand and costing nothing when the traffic falls off to zero. For low-traffic applications, the hosting costs could be zero because of IBM Cloud Function's generous [free tier](https://console.ng.bluemix.net/openwhisk/learn/pricing).

OpenWhisk is an example of a "serverless" platform. Instead of worrying about servers, operating systems, queues, containers, networking, and infrastructure uptime, you simply deploy the *functions* you wish to run. By pairing these functions as HTTP API calls, you can stand up a RESTful API service without managing any infrastructure yourself.

![schematic](/img/envoy-serverless-schematic.png)

Each API call is a separate OpenWhisk *action*, in its own JavaScript file, and is usually tasked with handling a single API call. Sometimes the same action handles variants of the same API call, such as the GET and POST versions of the same call, or handles a range of paths (e.g., GET `/db/*`).

Each action is independent of the others, is stateless (apart from the data that is stored in the Cloudant database), and can be deployed and updated separately.

The API Gateway handles authentication and routes the HTTP calls through to the corresponding action.

## Deploying Envoy Serverless

You'll need a [Bluemix](https://bluemix.net) account, and then follow the [Getting started with Cloud Functions](https://console.ng.bluemix.net/docs/openwhisk/index.html#getting-started-with-openwhisk) instructions to download and install the `wsk` tool.

Create a Cloudant instance in Bluemix, and make note of its URL. In your Cloudant dashboard, create a new database called "envoydb".

Clone the `envoy-serverless` project:

```sh
git clone https://github.com/glynnbird/envoy-serverless
cd envoy-serverless
```

Create an environment variable containing your Cloudant URL:

```sh
export COUCH_HOST="https://USERNAME:PASSWORD@HOST.cloudant.com"
```

And deploy:

```sh
./deploy.sh
```

The script will output the URL of your service. It will look something like this:

```
https://service.us.apiconnect.ibmcloud.com/gws/apigateway/api/YOURSERVICEID/api/envoydb
```
 
In the OpenWhisk dashboard under the [API Management tab](https://console.ng.bluemix.net/openwhisk/apimanagement) you should see your deployed API calls:

![envoy auth](/img/envoy-deployed.png)

Below this you will need to secure your API by ticking the "Require consuming applications to authenticate via API Key" box and clicking "Save":

![envoy auth](/img/envoy-auth.png')

You should now only be able to access your API with a valid API Key (which can be created in the "Sharing" tab):

```sh
> curl 'https://service.us.apiconnect.ibmcloud.com/gws/apigateway/api/YOURSERVICEID/api/envoydb/_all_docs'
{"status":401,"message":"Error: Unauthorized"}

> curl -H 'x-ibm-client-id: VALID_API_KEY' 'https://service.us.apiconnect.ibmcloud.com/gws/apigatewa/api/YOURSERVICEID/api/envoydb/_all_docs'
{
  "total_rows": 0,
  "offset": 0,
  "rows": []
}
```

See the [source code](https://github.com/glynnbird/envoy-serverless) for further examples.

## Pros and cons of serverless deployment

Is an OpenWhisk deployment *better* than a virtual machine for an Envoy deployment? The answer is nuanced.

A 24x7 virtual machine may have slightly better performance because it can re-use HTTP connections, saving the effort of performing DNS lookups and establishing a new socket. It can also use streaming to provide an efficient flow of moving data through the proxy, whereas OpenWhisk cannot.

The OpenWhisk version has fewer lines of code because it delegates authentication and the HTTP server infrastructure to the OpenWhisk stack. It is also easier to scale as OpenWhisk handles the deployment of computing power needed to meet the demand of the incoming API calls. 

That's it! If you're using Cloudant in an application architecture that follows the CouchDB one-database-per-user model, let me know in the response below. Deploying Cloudant Envoy in either the traditional or serverless fashion could be a good option.

