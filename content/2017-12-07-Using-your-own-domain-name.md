---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-12-07T09:00:00.000Z
description: Using Cloud Functions as a proxy
image: /img/finn-hackshaw-131930-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/using-your-own-domain-name-with-cloudant-b63699db96bd
tags:
  - Domain
  - Serverless
title: Using your own domain
type: blog
url: /2017/12/07/Using-your-own-domain-name.html
---


Until recently, Cloudant allowed you to bring your own domain name through its "virtual hosts" functionality. This feature is now being removed for security reasons.

If you still want to be able to access the Cloudant API through your own domain name, you can do it by creating a *serverless proxy* that is hosted on [IBM Cloud Functions](https://www.ibm.com/cloud/functions), IBM's serverless platform.

![schematic](/img/serverless-proxy1.png)

A number of serverless "actions" are deployed&mdash;one per API call you need to proxy. They are served out by the IBM Cloud Functions API Gateway, which provides authentication and rate-limiting of your service. Finally, you can configure the API gateway to use *your* domain name and to perform the SSL termination so that your API is served out securely.

## Prequisites

First we need the source code. You'll need the `git` tool and to be familiar with command-line tools:

```sh
git clone https://github.com/ibm-watson-data-lab/serverless-proxy.git
cd serverless-proxy
```

If you haven't done so already, [sign up for an IBM Cloud account](https://bluemix.net) (formerly branded as "Bluemix"). Follow the [Getting Started with IBM Cloud Functions guide](https://console.ng.bluemix.net/openwhisk/getting-started) to download the `bx wsk` tool and configure it for your account. 

If you don't already have a Cloudant account, in your IBM Cloud dashboard create a Cloudant service and make a note of its URL. In the Cloudant dashboard, create a new empty database (say, 'mydb'). This is the database we will be using in our proxy deployment.

## Installation

Before we deploy our code, we need to define the following:

- the URL of the Cloudant service we are using
- the name of the database we are working with

These two pieces of information need to be stored in environment variables like so:

```sh
export COUCH_HOST="https://USERNAME:PASSWORD@HOST.cloudant.com"
export COUCH_DATABASE="mydb"
```

Now we can run the deployment script:

```sh
./deploy.sh
```
    
This will configure a number of serverless actions&mdash;one for each Cloudant endpoint that is supported. It also configures the IBM Cloud Functions [API Gateway](https://console.bluemix.net/docs/apis/management/index.html#index) to map API calls to those actions. We end up with a set of Cloudant-like API calls hosted on IBM Cloud Functions.

In the IBM Cloud Functions dashboard we can configure that API to: 

- limit access to only those that have an API key
- only allow those who have an OAuth cookie
- rate-limit requests per user

By default, however, the API is open, meaning that anyone who has access to this API can read, write, update, or delete Cloudant data.

## Secure your traffic

To use a custom domain, first you need a domain name. I created a subdomain: `mycloudant.glynnbird.com`. You need to configure the DNS for that domain name using the [instructions here](https://console.bluemix.net/docs/apis/management/manage_apis.html#custom_domains). 

Then we need a secure certificate for that domain name. Fortunately, thanks to the folks at [Let's Encrypt](https://letsencrypt.org/), secure certificates are now free. I found the simplest way to get one was to use the [https://www.sslforfree.com](https://www.sslforfree.com) website and download the certifcate to a `mycert.crt` and the private key to `mykey.key` file.

Configure your IBM Cloud account to accept your domain name and upload your certificate and private key using the [instructions here](https://console.bluemix.net/docs/apis/management/manage_apis.html#custom_domains). 

At this point, your API should be served out on your custom domain name using HTTPS. 
