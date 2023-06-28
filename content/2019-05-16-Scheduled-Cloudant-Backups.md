---
author: Glynn Bird
authorLink: https://glynnbird.com/
date: 2019-05-15T06:00:00.000Z
description: Backing up your data periodically using Kubernetes.
image: /img/boba-jovanovic-65138-unsplash.jpg
relcanonical: null
tags:
  - Backup
  - COS
  - Kubernetes
title: Scheduled Cloudant Backups
type: blog
url: /2019/05/16/Scheduled-Cloudant-Backups.html
---


The [Couchbackup](https://www.npmjs.com/package/@cloudant/couchbackup) project provides a simple command-line tool to backup a Cloudant database to a file. From there it can uploaded to [IBM Cloud Object Storage](https://www.ibm.com/cloud/object-storage) for archival. 

```sh
# backup a single database to a file
couchbackup --db mydatabase > mydatabase.txt

# copy the file to Object Storage
aws --endpoint-url=$ENDPOINT \
   s3 cp mydatabase.txt s3://mycloudantbackups/
```

As well a command-line tool,  *couchbackup* can also be used as a Node.js library so that you can script your own workflows to suit your application. The couchbackup source code has [example scripts](https://github.com/cloudant/couchbackup/tree/master/examples) which you can use as a basis of your own.

In this post we'll create a Kubernetes service that runs periodically to backup a Cloudant database. This can be scheduled to run at hourly, daily, weekly or monthly intervals, for example.

![container]({{< param "image" >}})
> Photo by [Boba Jovanovic on Unsplash](https://unsplash.com/photos/FtRkRespN24)

## Pre-requisites


1. An [IBM Cloud](https://www.ibm.com/cloud) account.
2. An [IBM Cloudant](https://www.ibm.com/uk-en/cloud/cloudant) service with a database containing documents you wish to backup.
3. An [IBM Cloud Object Storage](https://www.ibm.com/cloud/object-storage) service with set of [HMAC credentials](https://cloud.ibm.com/docs/services/cloud-object-storage/hmac?topic=cloud-object-storage-service-credentials).
4. An [IBM Kubernetes Service](https://www.ibm.com/uk-en/cloud/container-service).

## Running the backup script on your machine

Using the [s3-backup-stream.js](https://github.com/cloudant/couchbackup/blob/master/examples/s3-backup-stream.js) as a basis for our script, we want our code to:

- Backup a single database to object storage without storing local disk first.
- Receive all of its connection configuration (Cloudant URL & Object Storage bucket, URL and authentication keys) as environment variables.

The source code of our script is [here](https://github.com/glynnbird/scheduledcloudantbackup.git) and can be executed on your machine as follows:

```sh
# Clone the repository.
git clone https://github.com/glynnbird/scheduledcloudantbackup.git

# Install this project's dependencies.
cd scheduledcloudantbackup
npm install

# Create environment variables containing credentials.
# Replace <placeholders> with your data. 
# Swap "export" for "set" on a Windows machine.
export COUCH_URL="https://<username>:<password>@<host>/<db>"
export COS_ENDPOINT_URL="https://s3.<region>.cloud-object-storage.appdomain.cloud/"
export COS_BUCKET="<bucket>"
export AWS_ACCESS_KEY_ID="<access key id>"
export AWS_SECRET_ACCESS_KEY="<secret access key>"

# Run the backup.
npm run start
```

## Running as a Docker container

This script can also be run as a Docker container. If you have [Docker](https://www.docker.com/) installed on your machine, run the following commands:

```sh
# Build the image.
docker build -t scheduledcloudantbackup .

# Spin up a container based on this image passing in 
# environment variables with connection details.
docker run \
  --env COUCH_URL="$COUCH_URL" \
  --env COS_ENDPOINT_URL="$COS_ENDPOINT_URL" \
  --env COS_BUCKET="$COS_BUCKET" \
  --env AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  --env AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  scheduledcloudantbackup
```

The values beginning with `$` are replaced with the environment variables we created in the previous step.

## Running automatically in Kubernetes

To run the backup unattended every hour, we need to schedule this process to run periodically. IBM's Kubernetes service has a "cron job" function that is designed for just this purpose. First we need to register our Docker image with the IBM Kubernetes service:

1. Sign up for a [IBM Kubernetes](https://www.ibm.com/uk-en/cloud/container-service) service.
2. Follow the [instructions](https://cloud.ibm.com/docs/containers?topic=containers-cs_cli_install) on how to install the `ibmcloud` command-line tools.
3. Authenticate. e.g. `ibmcloud login`
4. Set the Kubernetes target. e.g. `ibmcloud ks region-set eu-gb`. I chose the `eu-gb` region - [others are available](https://cloud.ibm.com/docs/containers?topic=containers-regions-and-zones). 
5. Download the cluster config e.g. `ibmcloud ks cluster-config scheduledcloudantbackup`
6. Log into the container registory service e.g. `ibmcloud cr login`
7. Create a namespace e.g. `ibmcloud cr namespace-add scheduledbackup`
8. Build an image e.g. `ibmcloud cr build -t uk.icr.io/scheduledbackup/backup:1 .`

So we now have an image called `uk.icr.io/scheduledbackup/backup:1` in the IBM image registry - we next need to trigger it to run periodically with a [Kubernetes cron job](https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/).

A "cron job" is a term taken from the Unix world - it means running a task periodically, say every hour. It has a syntax specifying the interval at which your code is to be run, in our case we want `0 * * * *` (see ["Crontab Guru"](https://crontab.guru/#0_*_*_*_*) for an explanation of that syntax) which means "at the top of every hour".

Our cron job definition resides in a "cronjob.yml" file which tells the Kubernetes cluster which image to spin up, at what interval and the environment variables it runs with. **Edit the `cronjob.yml` to configure your Cloudant service and Object Storage environment variables before running**:

```sh
kubectl create -f cronjob.yml
```

Now wait until the top of the hour for the backup process to begin. When it's complete, you should see time-stamped backup in your Object Storage bucket!

## Links

- [Kubernetes CronJobs](https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/)
- [Source code of this utility](https://github.com/glynnbird/scheduledcloudantbackup)
- [couchbackup](https://github.com/cloudant/couchbackup)