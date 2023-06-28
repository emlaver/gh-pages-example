---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2017-02-27T09:00:00.000Z
description: Using Cloud Functions & Cloudant
image: /img/markus-spiske-221494-unsplash.jpg
relcanonical: https://medium.com/ibm-watson-data-lab/how-i-used-serverless-infrastructure-to-build-a-large-scale-petition-system-2779161c4c68
tags:
  - Serverless
title: Build a serverless web app
type: blog
url: /2017/02/27/Online-petition-system.html
---


Is it possible to create a web application that collects data from a web form without using any servers? Of course not, but you would be forgiven for thinking that when reading the word "serverless". "Serverless" means that instead of having fixed numbers of dedicated machines sitting in data centres waiting for traffic to come in, we can supply the code that handles a single piece of work (e.g. the submission of a web form) to a an application framework like [IBM Cloud Functions](https://www.ibm.com/cloud-computing/bluemix/openwhisk) and let *it* scale out the computing power required. If no traffic arrives, you don't pay anything - no fixed costs!

Let's take an example. In the UK, there is a government petitions website where members of the public can gather support for issues they would like debated in the House of Commons. Recently, over 1.8m signatures were collected on a petition urging the government to [rescind Donald Trump's state visit](https://petition.parliament.uk/petitions/171928) invitation.

If you were building an IT system to collect large-scale public petitions, you would have no idea how popular each was to be or how much computing power you'd need to make the site performant. The "serverless" paradigm is compelling in this use-case, as you only pay for the traffic you generate.

## Let's build a large-scale petition system

Modelling our system on the UK model, our petition system will have a public-facing website with a simple form detailing the issue being "signed". The user supplies their name, location, email addresss, confirms that they are a resident of the country in question, and submits the form. Our app saves the data in a Cloudant database and sends a verification email to the signatory.

![workflow1](/img/workflow1.png)

When the email arrives, the user clicks on the link to confirm and sign the petition


![workflow2](/img/workflow2.png)

At some future date, we can count the confirmed records in the database to see if the petition has reached the 100,000 records needed to trigger a debate in parliament.

We want our *whole infrastructure* to be "serverless" i.e. we won't stand up our own servers to run the website - the hosting, form handling, email sending, and database will be run by others with minimal or ideally no fixed costs.

## Serverless hosting

An obvious choice for "serverless" web hosting is [GitHub Pages](https://pages.github.com/). Sign up for GitHub, create a repository, and put some HTML/JavaScript/CSS in a `gh-pages` branch. Your website will be served out at `http://USERNAME.github.io/REPO/`. You can even point your  custom domain name to GitHub and it serves out your pages on that domain e.g. `mypetition.com`.

## Serverless computing

Use [IBM Cloud Functions](https://www.ibm.com/cloud-computing/bluemix/openwhisk) to handle form submissions and email verification requests. OpenWhisk lets you write your code in JavaScript, Swift, or Python and have it run in response to incoming events--in this case the submission of a web form or the clicking of a link in an email.

## Serverless transactional email

In order to send emails to signatories, you need a transactional email service. I set up an email template with placeholders for the content that changes between recipients. The email provider ensures that the emails are sent, avoiding each users' spam filter. I used [SendGrid](https://sendgrid.com/) because they let you send a templated email via a simple API call.

## Serverless database storage

Ultimately we need to store our data *somewhere*. So *someone* is going to have to manage some servers and disks. By using the [Cloudant](https://console.ng.bluemix.net/catalog/cloudant-nosql-db) database-as-a-service, we don't have to have fixed servers dedicated to us; we can simply consume a database service on a shared cluster and pay only for the requests and storage that we use. 

## Designing our data flows

OpenWhisk computing tasks are built up from *actions*. You can combine many *actions* into *sequences* of actions and activate them with incoming data (such as an API call).

Create two API calls that activate OpenWhisk computing resources:

- `POST /petition/submit` - to verify a form submission, save the data to Cloudant, and dispatch the email.
- `POST /petition/confirm` - to confirm that the user has clicked on a link from the email. Another GitHub pages page renders on the browser, which makes an API call to OpenWhisk. The database record updates to mark the signature as "confirmed".

![workflow3](/img/workflow3.png)

The `POST /petition/submit` is actually three separate OpenWhisk actions chained in a sequence, whereas `POST /petition/confirm` is configured as a single OpenWhisk action.

OpenWhisk uses IBM's [API Connect](https://console.ng.bluemix.net/docs/services/apiconnect/index.html) to map actions and action sequences to public-facing API calls.

## Sign up for the services

Going serverless means you don't have to deal with equipment, virtual servers, operating systems or networking, but you still have to sign up for some accounts:

- sign up for an [IBM Bluemix](https://bluemix.net) account
- follow [Getting started with OpenWhisk](https://console.ng.bluemix.net/docs/openwhisk/index.html#getting-started-with-openwhisk) to get the `wsk` tool installed and authenticated
- inside Bluemix, sign up for a Cloudant service. Make a note of the Cloudant URL, including username and password.
- setup a [SendGrid](https://sendgrid.com/) account, create an API key that has permissions to send transactional emails and create an email template
- create a [Github](https://github.com/) account create a repository with your web site in it and branch to a `gh-pages` branch

## Deploying Cloud Functions code

IBM Cloud Functions has nice dashboard where you can paste your code, build sequences, and try your code. This is fine when taking your first few steps with "serverless" but very soon you'll want to script the deployment of your code so that it can be automated and reproduced easily.

Assuming you have the `wsk` tool installed and it is authenticated against your Bluemix service, then installing our code is a breeze. Just clone the *git* repository 'https://github.com/ibm-cds-labs/online-petition.git' and run the `deploy.sh` script from the `openwhisk` directory.

This script assumes that you have the following environment variables set up:

- `COUCH_URL` = the URL of the Cloudant service e.g. https://u:p@host.cloudant.com
- `COUCH_DBNAME` = the name of the Cloudant database e.g. petition
- `SENDGRIDBEARER` = the SendGrid API key 
- `SENDGRIDSENDER` = the email address that emails will appear to come from
- `SENDGRIDTEMPLATEID` = the SendGrid email template id to email 

GIST! https://gist.github.com/glynnbird/2a80a059f4002e327f42e83feebfef7f

It's worth understanding each step in the deployment script. Notice how the credentials are encapsulated into a 'package' called 'petition' to which each of the actions is added. Then three of the actions are combined into a sequence before they are finally exposed as public API calls using the `api-experimental` command. Each API call also has an 'OPTIONS' method - this is quirk of CORS restrictions (the rules that prevent a website from making API calls to other servers). We need the dummy 'OPTIONS' API call to convince the browser that the main 'POST' request is permitted.

## Try it yourself

You can sign our demo petition yourself [here](https://ibm-cds-labs.github.io/online-petition/). The code that appears on that page is in [this GitHub repository](https://github.com/ibm-cds-labs/online-petition). The IBM Cloud Functions "actions" and the deployment script can be found in the [openwhisk directory](https://github.com/ibm-cds-labs/online-petition/tree/master/openwhisk).

## Who's paying the bill?

So I have a totally "serverless" system with Github serving the static content, IBM Cloud Functions handling the form submissions, SendGrid sending emails, and Cloudant storing the data. But is serverless free? 

> Not free - it's pay-as-you-go.

- GitHub reserves the right to [disable or throttle](https://help.github.com/articles/github-terms-of-service/) your site's usage if your content is very popular
- SendGrid has a [range of plans](https://sendgrid.com/pricing/) that start at free for the first month but typically allow you to send tens of thousands of emails from $10 per month.
- [IBM Cloud Functions has a free tier](https://console.ng.bluemix.net/openwhisk/learn/pricing) and then takes payment depending on the volume, memory, and execution time of your actions.
- Cloudant's default [Lite Plan](https://console.ng.bluemix.net/docs/services/Cloudant/offerings/bluemix.html#ibm-bluemix) offers a limited API call limit for free, or increased capacity for additional dollars per month.

So it's possible to create something like this and run it for free for a while (until your free trial runs out!) and up to a certain amount of traffic (depending on whether you run out of hosting, email capacity, or database storage first).

The important point is that you can setup an IT system with $0 fixed costs, paying extra money to add extra capacity. IBM Cloud Functions lets you  scale your application to deal with spikes in traffic but have no fixed costs for when there is no demand.


