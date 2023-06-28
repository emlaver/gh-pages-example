---
author: Simon Metson
authorLink: https://metsonet.co.uk
date: 2020-07-30T06:00:00.000Z
description: Auditree - open source compliance automation for the cloud
image: /img/rachel-o3tIY5pIork-unsplash.jpg
relcanonical: null
tags:
  - Automation
  - Compliance
  - Open Source
title: Compliance automation via Auditree
type: blog
url: /2020/07/30/compliance-automation-auditree.html
---


Over the past few years Cloudant has been engaging in more and more [compliance related work][cloudant-compliance]. This is a good thing; it gives customers confidence in the systems holding their data, and it gives us a way to critically evaluate & improve our product & processes.

A compliance accreditation is made up of controls. In some cases [lots of controls][nist], all of which need to be consistently & continually executed, with evidence of successful (or otherwise) execution collected for audit. This is complicated by the size & dynamism of a Cloud estate, especially for a service the size of Cloudant.

Auditors need to see a lot of evidence data, and can "sample" any device at any point within the audit period. As we got more involved in compliance activities we quickly realised that we needed some automation to scale collection and verification of evidence if we were going to be successful in our compliance activities.

We have built an automation framework to address the problems compliance at scale presents. It ensures a continuity of evidence, while also helping operationally manage compliance posture by verifying that evidence as it is collected.

The good news: the [framework][] & tools we've built for our compliance automation is [now open source][auditree]!

## Introducing Auditree

From the [Auditree homepage][auditree]:

> Auditree is an opinionated set of tools to enable the digital transformation of compliance activities. It is designed to be familiar to DevOps teams and software engineers, using tools they are likely already interacting with daily.

What does that mean? Well, we've built a framework & set of associated tools that helps us turn compliance problems into engineering problems. Instead of clipboards and spreadsheets we have unit tests and data in git. Cloudant has been using this since 2017, and other teams in IBM have been adopting it since 2018.

It's no secret that Cloudant [uses Chef][chef] & a range of CI/CD tools to manage our estate. We also write a lot of things in Python. We've used ideas from CI/CD & configuration management in Auditree.

Evidence is collected from APIs by "[fetchers][]" and verified by "[checks][]". These are just decorated Python unit tests, so generally easy for developers to build while also being flexible and capable. Checks produce reports, and their status (pass/fail/warn) can be sent to notifiers; Slack, issue trackers etc.

Those decorators manage writing/reading evidence in a "[locker][]". The locker is a git repository with some additional tracking metadata provided by the framework. We chose git because it is tamper evident, gives us history of data in an efficient manner and, most importantly, familiar to engineers. If data hasn't changed since the last execution, git won't update the file, hence we track metadata such as last retrieval time alongside the evidence. Evidence is given a TTL (time to live) in the locker and only retrieved if that has expired to avoid unnecessary and possibly expensive calls to the providers of evidence.

The framework is designed to fail & recover cleanly, with each execution being a fresh install of both the framework & fetchers/checks. We run the set of fetchers/checks every 8 hours. This is key for two reasons. Firstly, it allows us to build up a consistent & comprehensive body of evidence. Secondly, it means that our global team has opportunity to identify & remediate issues or deviations before the next run, while not being "noisy".

## Ecosystem

While the execution of the framework is key, providing both operational oversight & a body of evidence, we've found there are other parts of the compliance puzzle that need specific tools to address.

### Harvest

[Harvest][harvest] collates evidence (well, any file in git) over time, which allows you to build & run reports & analysis over the contents of the locker, beyond what checks are doing. This is useful when answering a data request over a period of time, or if you want to have periodic roll ups of data for reporting to the organisation.

### Plant

While automated data collection is key to scaling compliance activities, there are some pieces of evidence, for example a penetration test report, that may not be retrievable in this manner. [Plant][plant] provides a way to manually correctly place data in the locker, so that it can be verified by checks.

### Prune

One of the first checks we built was [`test_abandoned_evidence`][tae]. This is important because it will catch valid data that hasn't been updated for a long time - a possible sign of a misconfiguration somewhere. However, while this is important for detecting problems is also creates an issue: if I no longer use a service I won't collect evidence from it, and this check will start to fire. I also can't just remove the evidence files - they may still be relevant for future audits. We need a way to correctly manage the retirement of evidence, and that is [Prune][prune].

## Over to you

Auditree is a set of building blocks to help engineers address compliance issues at scale. We're open sourcing it because we think it is useful, but also to see how others are addressing the same problems. We are building a public library of fetchers & checks (and a fairly long backlog of things to bring into the open source domain) in [Arboretum][arboretum], and would welcome contributions in any size or shape there, or in any of the repositories, from the community.

[auditree]: https://auditree.github.io/
[nist]: https://nvd.nist.gov/800-53/Rev4
[framework]: https://github.com/ComplianceAsCode/auditree-framework
[chef]: https://blog.cloudant.com/2019/11/01/Improve-and-then-improve-some-more.html
[cloudant-compliance]: https://cloud.ibm.com/docs/Cloudant?topic=Cloudant-compliance
[fetchers]: https://github.com/ComplianceAsCode/auditree-framework/blob/main/compliance/fetch.py
[checks]: https://github.com/ComplianceAsCode/auditree-framework/blob/main/compliance/check.py
[locker]: https://github.com/ComplianceAsCode/auditree-framework/blob/main/compliance/locker.py
[harvest]: https://github.com/ComplianceAsCode/auditree-harvest
[plant]: https://github.com/ComplianceAsCode/auditree-plant
[prune]: https://github.com/ComplianceAsCode/auditree-prune
[arboretum]: https://github.com/ComplianceAsCode/auditree-arboretum/
[tae]: https://github.com/ComplianceAsCode/auditree-arboretum/blob/main/arboretum/technology/auditree/checks/test_abandoned_evidence.py