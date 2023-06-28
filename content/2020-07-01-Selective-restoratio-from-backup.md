---
author: Debatosh Tripathy
authorLink: https://github.com/d-tripathy
date: 2020-07-01T06:01:00.000Z
description: Only restore the Cloudant documents you need
image: /img/anthony-martino-6AtQNsjMoJo-unsplash.jpg
tags:
  - Backup
  - Restore
title: Selective restoration from backup
type: blog
url: /2020/07/01/Selective-restoratio-from-backup.html
---


As part of the disaster recovery process, the Cloudant NoSQL database offers the database backup and restore through the command-line utilities such as couchbackup & couchrestore respectively.

- couchbackup - Dumps the JSON data from a database to a backup text file.
- couchrestore - Restores data from a backup text file to a database.

The couchrestore utility has one limitation: it can restore the full database but can’t selectively restore specific records. So, to recover data caused by accidental deletion, we have to go with approaches such as restoring the data from the backup file to a new database and use either [filtered replication](https://cloud.ibm.com/docs/services/Cloudant?topic=cloudant-advanced-replication#filtered-replication-adv-repl) or [named document replication](https://cloud.ibm.com/docs/services/Cloudant?topic=cloudant-advanced-replication#named-document-replication) to retrieve the selected records.

In both approaches, it is required to restore the database first. This would make the data recovery process painfully slow in case the database contains millions of records and the database backup file size is in hundreds of GBs.

To address the problem of accidental deletion of database records, without following the lengthy process of restoring the full Cloudant database, we could use a stand-alone Node.js script. This script filters through the database backup file and find the relevant record/records and writes it to a file. Once we have the data in JSON format, we could insert those back to the database either manually or programmatically.

![]({{< param "image" >}})
> Photo by [Anthony Martino on Unsplash](https://unsplash.com/photos/6AtQNsjMoJo)

> Note: The script could be reprogramed to insert the selective record/records back to the target database, instead of writing it to a file.

## Sample NodeJS Script

```javascript

const exec = require('child_process').exec;
const fs = require('fs');

// File name to be read
var fileName = 'cloudant_db_backup.txt';

// Get the id or ids from the command line arguments. 'val' contains the search string.
process.argv.forEach(function(val, index, array) {
  if (index > 1) {
    // Construct the shell script command.
    var shellCommand = 'grep -w ' + val + ' ' + fileName;
    // increase buffer size if the backup file is pretty huge. For this example buffer size is set to 1500 KB.
    exec(shellCommand, {
      maxBuffer: 1024 * 1500
    }, (err, stdout, stderr) => {
      if (err) {
        console.error('>>> ' + err);
        return;
      }
      var lineArray = JSON.parse(stdout);
      // Match the _id of individual document.
      lineArray.filter(function(item) {
        if (item._id == val) {
          // Write the output to the file.
          fs.writeFile('doc_' + item._id + '.json', JSON.stringify(item, null, 2), function(err) {
            if (err) throw err;
          });
          console.log('>>> File created successfully');
        }
      });
    });
  }
});
```

> Note: The above Node.js script uses shell script grep command instead of any available node module for searching text patterns because it is way faster compared to all and significantly reduces the search time for very very large database backup files.

## How does the script work?

To demonstrate this example we'll need a database with some sample data in your account.

### Step 1

Create a new database `mydb` and populate it with data.

### Step 2 

Login to shell(should have nodejs installed) and take a backup of the above-mentioned database using "couchbackup" command.

e.g. 

```sh
couchbackup --url https://username:password@account-name.cloudant.com --db mydb > /tmp/mydb.txt
```

### Step 3

Now to demonstrate the situation of accidental deletion of data, we can delete two documents movies-demo database randomly and the script could restore the missing documents. For example delete the documents having `_id` _"70f6284d2a395396dbb3a60b4ce22805"_ and _"70f6284d2a395396dbb3a60b4ce6aa97"_.

### Step 4

In the above Node.js script, change the `fileName` variable to _"mydb.txt"_, which is in this case is the name of the backup file and save it with name "find-document.js"

### Step 5

Now let's try to get back the deleted documents using the below command. This would produce two files with the content of the deleted documents in JSON format.

```sh
node find-document.js 70f6284d2a395396dbb3a60b4ce22805 70f6284d2a395396dbb3a60b4ce6aa97
```

### Step 6

Now we could copy the content of these two files and create the documents manually or using curl command in the mydb database. This script makes a difference and saves a lot of time when it comes to searching for records in backup files containing millions of records.
