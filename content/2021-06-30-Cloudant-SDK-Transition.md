---
author: Richard Ellis
authorLink: null
date: 2021-06-30T09:00:00.000Z
description: Introducing Cloudant's new SDKS and changes to supported SDKs
displayTags:
  - SDKs
  - mobile
image: /img/suzanne-d-williams-VMKBFR6r_jg-unsplash.jpg
relcanonical: null
tags:
  - SDKs
  - mobile
  - sync
  - java-cloudant
  - python-cloudant
  - nodejs-cloudant
  - swift-cloudant
  - cloudant-go-sdk
  - cloudant-java-sdk
  - cloudant-node-sdk
  - cloudant-python-sdk
title: Cloudant SDK Transition
type: blog
url: /2021/06/30/Cloudant-SDK-Transition.html
---


The IBM Cloudant team is introducing new Cloudant API SDKs and announcing end-of-life (EOL) for some existing libraries.
The new SDKs offer more consistency in the Cloudant SDK portfolio and unification with the common IBM Cloud SDK
experience. We leveraged this to produce improved [API documentation](https://cloud.ibm.com/apidocs/cloudant) spanning
the Cloudant HTTP and SDK APIs. This makes it easier to find not only the desired API, but also code examples for your
chosen ecosystem.

![Green chrysalis, translucent chrysalis, and imago of butterflies]({{< param "image" >}})
> Photo by [Suzanne D. Williams on Unsplash](https://unsplash.com/photos/VMKBFR6r_jg)

## Summary of SDK changes

#### Cloudant API SDKs

| Ecosystem | Existing supported library | Existing library EOL | Replaced by new supported SDK |
| --- | --- | --- | --- |
| Go | - | - | <https://github.com/IBM/cloudant-go-sdk> |
| Java | `com.cloudant:cloudant-client`<BR/><https://github.com/cloudant/java-cloudant> | Dec 31 2021 | `com.ibm.cloud:cloudant`<BR/><https://github.com/IBM/cloudant-java-sdk> |
| Node.js | `@cloudant/cloudant`<BR/><https://github.com/cloudant/nodejs-cloudant> | Dec 31 2021 | `@ibm-cloud/cloudant`<BR/><https://github.com/IBM/cloudant-node-sdk> |
| Python | `cloudant`<BR/><https://github.com/cloudant/python-cloudant> | Dec 31 2021 | `ibmcloudant`<BR/><https://github.com/IBM/cloudant-python-sdk> |
| Swift | `SwiftCloudant`<BR/><https://github.com/cloudant/swift-cloudant> | Dec 31 2021 | No |

#### Mobile sync libraries

| Ecosystem | Existing supported library | Existing library EOL | Replaced by new supported SDK |
| --- | --- | --- | --- |
| iOS | <https://github.com/cloudant/CDTDatastore> | Dec 31 2021 | No |
| Android | <https://github.com/cloudant/sync-android> | Dec 31 2021 | No |

## Introducing new Cloudant API SDKs

The team at IBM Cloudant has been working hard to produce new SDKs that provide a more unified API experience.
Our goal has been to provide all of our supported languages with:
* more modern, complete and consistent Cloudant API coverage
* equivalent functionality between languages
* enhanced documentation and examples
* unified IBM Cloud SDK experience

The new IBM Cloudant API SDKs have been delivered into the `IBM` GitHub organization to live alongside the SDKs from
many other IBM Cloud services. You can find them here:
* Go: <https://github.com/IBM/cloudant-go-sdk>
* Java: <https://github.com/IBM/cloudant-java-sdk>
* Node: <https://github.com/IBM/cloudant-node-sdk>
* Python: <https://github.com/IBM/cloudant-python-sdk>

The new SDKs are built on the [common IBM Cloud SDK cores](https://github.com/IBM/ibm-cloud-sdk-common/) that are in use
across many other IBM Cloud service SDKs. Amongst other things this shared core provides the new Cloudant SDKs with
revamped IAM auth, flexibility of configuration and upgraded HTTP options.

In addition to the improvements described above, the change to the new SDKs has given us the room to resolve some
long-standing feature requests from the old libraries. Read more about the benefits of the new SDKs in their
repositories.

You may notice [these libraries are flagged `beta`](#why-are-the-new-sdks-still-early-releases). We consider these
libraries production-ready and capable, but there are still some limitations we're working to resolve, and refinements
we want to deliver. We are working really hard to minimise the disruption from now until the 1.0 releases. For now,
be sure to pin versions to avoid surprises.

This is only the beginning of our new SDKs chapter and we are looking forward to taking advantage of these new
foundations to provide extra features and functionality to evolve the Cloudant development experience. We welcome your
feedback on the new SDKs, please feel free to provide it via issues in the repositories or by
[contacting Cloudant support](#where-can-i-get-more-help).

## EOL for existing libraries

It is never easy to take the decision to retire existing software. IBM Cloudant's SDK portfolio developed from a variety
of forks of open source projects and prototypes. As a result, we have reached a position where the existing libraries
exhibit wide discrepancies in API coverage, functionality and even naming (e.g. `insert` vs `save` vs `create_document`).
These factors produce challenges in communication, maintenance, and our ability to add new features.

Further to that the demand for SDKs has varied in response to changing use cases, industry trends, and the emergence of
new ecosystems. Coupled with the rate of change of the existing underlying ecosystems it has become increasingly
challenging to keep the current portfolio up-to-date.

Over time IBM Cloudant has become more integrated with the IBM Cloud experience and the existing SDKs were not in a
position to take advantage of the available common frameworks and tooling that would enable us to provide a more unified
IBM Cloud experience. The introduction of the new SDKs has resolved that gap, but it has also driven us to re-evaluate
the other libraries.

Motivated by these reasons we have taken the difficult decision to announce that the end-of-life for the following
libraries will be December 31 2021:
#### java-cloudant
* Maven `com.cloudant:cloudant-client`; <https://github.com/cloudant/java-cloudant>

#### nodejs-cloudant
* NPM `@cloudant/cloudant`; <https://github.com/cloudant/nodejs-cloudant>

#### python-cloudant
* PyPi `cloudant`; <https://github.com/cloudant/python-cloudant>

#### swift-cloudant
* Swift Package Manager `SwiftCloudant`; <https://github.com/cloudant/swift-cloudant>

#### CDTDatastore
* CocoaPods `CDTDatastore`; <https://github.com/cloudant/CDTDatastore>

#### sync-android
* Maven `com.cloudant:cloudant-sync-datastore*`; <https://github.com/cloudant/sync-android>

### Migrating from existing libraries to new SDKs

For Java, Node.js and Python we recommend migrating from the existing libraries to the new SDKs. Unfortunately the new
Cloudant API SDKs are not API compatible with the existing language libraries, but we have produced
migration guides for each language. These guides outline the major differences and will help you get started. They also
provide a mapping of the existing functions to their new equivalents.
* [Java migration guide](https://github.com/cloudant/java-cloudant/blob/master/MIGRATION.md)
* [Node.js migration guide](https://github.com/cloudant/nodejs-cloudant/blob/master/MIGRATION.md)
* [Python migration guide](https://github.com/cloudant/python-cloudant/blob/master/MIGRATION.md)

These migration guides also link to our new API documentation that includes full operation listings and for each
operation provides the complete parameter descriptions and a usage example. The new SDKs also have documentation
published in the language-specific API document format that may also help you identify the syntax you need to use.

Please raise issues on the repositories or [contact Cloudant support](#where-can-i-get-more-help) if you would like
additional help with specific migration scenarios, we will do our best to assist you and potentially add new examples to
cover more complex uses.

### Libraries without replacements

For the Swift library and mobile sync libraries, we have no plans to provide replacements at this time and as such we do
not have any migration guides. For more information see the FAQs:
* [Why aren't you replacing the mobile sync libraries?](#why-arent-you-replacing-the-mobile-sync-libraries)
* [Why aren't you replacing the Swift library?](#why-arent-you-replacing-the-swift-library)

There has been some interest in the Apache CouchDB community about developing forks of the mobile sync libraries. We
will update this post with more information as it becomes available.

## FAQs

#### What does end-of-life (EOL) mean?

It means that IBM Cloudant will no longer:
* fix bugs or release new versions
* provide official support for use of the libraries

#### Can I keep using a library after the EOL date?

Yes, you are free to continue using the code for as long as you wish. The existing released binaries will remain
available from their respective public repositories. You do need to be aware that Cloudant will no longer be making new
releases with fixes or updated dependency versions for e.g. security updates. You also need to be aware that Cloudant
support will not provide specific support for libraries that have passed EOL.

#### Can I fork an EOL library?

Absolutely! The code is open-source and Apache 2 licensed. Although we will archive (make read only) the current
repositories on GitHub the code will still be accessible and fork-able and current forks will be unaffected.

#### I don't want to change my code, what can I do?

* You can continue to use the existing library subject to your acceptance of the risks
  [outlined above](#can-i-keep-using-a-library-after-the-eol-date).
* You can fork the library and maintain your own version.
* You may be able to consume a fork produced by others who also don't want to migrate.
* For Node.js you may be able to use [Apache CouchDB Nano](https://github.com/apache/couchdb-nano) which shares much of
  the same API as [nodejs-cloudant](https://github.com/cloudant/nodejs-cloudant).

#### Why aren't you replacing the mobile sync libraries?

Usage of the mobile sync libraries with IBM Cloudant services is very low compared to the direct API libraries. The
mobile libraries are functionally complex including their own data stores, replicators and query engines. Many of the
few existing users do not require full replication or client side query features for their use cases and that coupled
with the limitations of the DB-per-user model mean the libraries are not widely used in the ways originally intended.
Significant investment would be required to bring the large feature set up-to-date and keep pace with server-side
Cloudant features. At this time the low usage of the libraries does not justify that investment.

As a Cloudant customer if you want to express your support for mobile sync libraries, please
[contact Cloudant support](#where-can-i-get-more-help) and make a feature request.

#### Why aren't you replacing the Swift library?

We do not currently have plans for a new Swift SDK. The reasons for this are:
* Low usage of the [swift-cloudant](https://github.com/cloudant/swift-cloudant) library
* The current [IBM Cloud SDK core primary languages](https://github.com/IBM/ibm-cloud-sdk-common#overview) are Go, Java,
  Node.js and Python
* [Reduced focus on server-side Swift](https://forums.swift.org/t/december-12th-2019/31735)

As a Cloudant customer if you want to express your support for a Swift SDK, please
[contact Cloudant support](#where-can-i-get-more-help) and make a feature request.

#### Why aren't you transferring the repos to another project?

We want to avoid the impression that any continuation of the project is officially supported by IBM Cloudant. Transfer
of the repositories will mean existing links do not show deprecation notices and we'd particularly want to avoid new
binaries being published where they might get pulled in-range without consumers knowing they were using a different
project that was now unsupported by IBM Cloudant.

#### Are the new SDKs Apache CouchDB compatible?

Yes! Even though we are using the IBM Cloud common SDK framework the API SDKs still use the HTTP API and retain
compatibility with Apache CouchDB 3.x APIs. We have also included custom authenticators to enhance compatibility with
CouchDB's session cookies. We have made some opinionated decisions not to expose some HTTP operations in the SDKs to
better reflect the non-administrative API set exposed to Cloudant users and avoid encouraging use of APIs that are
deprecated or not considered best-practice to use, but the majority of the CouchDB APIs are available to use.

#### Are the new SDKs open-source?

Yes, the new SDKs are open-source and Apache 2 licensed.

#### Why are the new SDKs still early releases?

The new SDKs have been available in early-release status for almost a year and we are confident in their functionality.
We are continuing our testing program and addressing feedback from early adopters as well as fixing server issues
exposed by some of the new client-side capabilities. Our expectation is that the `beta` tag will be removed in the very near future.

The SDKs will initially remain 0.x versions because we still expect some API changes. The already existing Apache
CouchDB API does not translate trivially to the OpenAPI format we use for code generation to produce models and that has
resulted in a few rough edges. We are ironing out those few wrinkles to improve the SDK API as much as possible before
declaring a 1.0 with hopefully a much more stable long-term API. The majority of the API is already stable and we are
focused on rapid resolution of the remaining trouble spots as we actively drive towards 1.0 releases.

#### My business depends on the existing libraries and it is not possible for me to migrate in the time-frame. What can I do?

See:
* [Can I keep using a library after the EOL date?](#can-i-keep-using-a-library-after-the-eol-date)
* [I don't want to change my code, what can I do?](#i-dont-want-to-change-my-code-what-can-i-do)

#### What about Apache CouchDB Nano?

[Apache CouchDB Nano](https://github.com/apache/couchdb-nano) remains the official Apache CouchDB library for Node.js
and is not owned by IBM Cloudant. The existing [nodejs-cloudant](https://github.com/cloudant/nodejs-cloudant)
library extended Nano with Cloudant specific functions and often delivered those features back to Nano when Cloudant
only functions were contributed to Apache CouchDB.
With our new code generation model and core IBM Cloud modules this approach was no longer a good fit for our Node.js
library. We felt that it was preferable to provide the same user experience, feature availability and enhanced
documentation for the new official Cloudant Node.js SDK as for the other SDK ecosystems. Continuing to use Nano as a
base would have prevented that synergy.
We hope that increased choice and diversity for Apache CouchDB and Cloudant users in Node.js will be welcomed.

#### Where can I get more help?

Please feel free to open issues on the project GitHub repositories or contact support via your IBM Cloudant dashboard.