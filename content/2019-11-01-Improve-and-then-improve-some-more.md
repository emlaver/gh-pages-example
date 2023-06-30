---
author: Sheraz Rashid
date: 2019-11-01T06:00:00.000Z
description: The journey our team took to move a modern CI using Jenkins Pipeline.
image: /img/abhishek-gaurav-JOfghGQXHnM-unsplash.jpg
tags:
  - CI
  - CD
title: Improve and then improve some more
type: blog
url: /2019/11/01/Improve-and-then-improve-some-more.html
---


Modern software development requires a constant feedback loop in which software component correctness and whole-stack integration success can be efficiently validated. This feedback loop is realized through automation and continuous integration (CI). Well-implemented CI is imperative -- it increases transparency amongst developers for all aspects of the software development lifecycle (SLDC) by yielding the ability to rapidly build, test, and iterate on issues that might arise. Rapid iteration is the keystone of an agile workflow and is critical to business success, especially when you're a startup that gets acquired by a company like IBM. 

As a newcomer to IBM Cloudant's release engineering team the challenges of maintaining and extending our CI were apparent from the get-go. Cloudant's approach towards CI centered on the popular Jenkins CI platform which was configured by Chef. This had long been sufficient but our old workflow began to present some serious headaches. To keep configuration management tight we tracked Jenkins "freestyle" job definitions as XML ERB (Embedded RuBy) templates in our Chef assets repository. We found this aged rather poorly as XML templates began to bloat -- tracking numerous build steps often with e.g. Bash scripts embedded in the XML. An example of this is shown below. Please note some sections of the template have been ommitted from this example for clarity.

```xml
<?xml version='1.0' encoding='UTF-8'?>
<matrix-project plugin="matrix-project@1.4.1">
  <description>Builds the PAAS &amp; LOCAL versions of DBNEXT</description>
  ...many top-level XML tags removed for readability
  <axes>
    ...multiple Cloudant build variants by architecture, Platform-as-a-service and Cloudant Local options
  </axes>
  <builders>
  <hudson.tasks.Shell>
    <command>
# install pre-reqs
sudo apt-get -y install lsb-release

# fetch erlang over private network
wget -q http://files.cloudant.net/private/erlang/releases/$(uname -m)/$(lsb_release -cs)/OTP-${ERLANG_VERSION}.tar.gz

# install erlang
sudo tar zxf OTP-${ERLANG_VERSION}.tar.gz -P
export PATH=/opt/erlang/OTP-${ERLANG_VERSION}/bin:$PATH

if [ "$type" = "paas" ];
then
    NAME=dbcore
    PREFIX=/$NAME
else
    NAME=cloudant
    PREFIX=/opt/$NAME
fi
BRANCH=`echo $GIT_BRANCH| cut -d'/' -f 2`
./configure $type \
  --user $NAME \
  --prefix $PREFIX \
  --db-dir /srv/db \
  --view-dir /srv/view_index \
  --search-dir /srv/search_index \
  --geo-dir /srv/geo_index \
  --node-name $NAME \
  --extdeps
make ci || exit 1
if [ -z &quot;$RELEASE_TAG&quot; ]
then
    make BUILD_NUMBER=$BUILD_NUMBER BRANCH=-$BRANCH branch
    if [ $BRANCH = &quot;master&quot; ]
    then
        make BUILD_NUMBER=$BUILD_NUMBER BRANCH=-$BRANCH latest
    fi
else
    make RELEASE_TAG=$RELEASE_TAG BUILD_NUMBER=$BUILD_NUMBER BRANCH=-$BRANCH release
fi</command>
</hudson.tasks.Shell>
  </builders>
  <publishers>
    ...many post-build publication strategies defined via XML
    <org.jenkins__ci.plugins.flexible__publish.FlexiblePublisher plugin="flexible-publish@0.14.1">
      <publishers>
        ...other minor publishers
        <org.jenkins__ci.plugins.flexible__publish.ConditionalPublisher>
          <condition class="org.jenkins_ci.plugins.run_condition.contributed.ShellCondition" plugin="run-condition@1.0">
            <command> #!/bin/sh
set -e
set +x
if [ -z &quot;$type&quot; ]
then
    AXIS_PATH=$JENKINS_HOME/jobs/dbnext/workspace/label
    JESSIE_PAAS_STATUS=`cat $AXIS_PATH/docker-local-jessie/type/paas/paas.status | awk &apos;{print tolower($0)}&apos;`

    if [ &quot;$JESSIE_PAAS_STATUS&quot; = &quot;success&quot; ]
    then
      exit 0
    else
      echo &quot;Paas build failed. Not triggering downstream jobs!&quot;
      exit 1
    fi
fi</command>
          </condition>
          <publisherList>
            <hudson.plugins.parameterizedtrigger.BuildTrigger plugin="parameterized-trigger@2.25">
              <configs>
                <hudson.plugins.parameterizedtrigger.BuildTriggerConfig>
                  <configs>
                    <hudson.plugins.parameterizedtrigger.PredefinedBuildParameters>
                      <properties>UPSTREAM_BUILD_NUMBER=$BUILD_NUMBER
UPSTREAM_BUILD_BRANCH=$GIT_BRANCH
UPSTREAM_BUILD_COMMIT_SHA=$GIT_COMMIT
UPSTREAM_RELEASE_TAG=$RELEASE_TAG</properties>
                    </hudson.plugins.parameterizedtrigger.PredefinedBuildParameters>
                  </configs>
                  <projects>test-cluster-dbnext-deploy</projects>
                  <condition>ALWAYS</condition>
                  <triggerWithNoParameters>false</triggerWithNoParameters>
                </hudson.plugins.parameterizedtrigger.BuildTriggerConfig>
              </configs>
            </hudson.plugins.parameterizedtrigger.BuildTrigger>
          </publisherList>
          ...more ConditionalPublisher settings
        </org.jenkins__ci.plugins.flexible__publish.ConditionalPublisher>
      </publishers>
    </org.jenkins__ci.plugins.flexible__publish.FlexiblePublisher>
  </publishers>
</matrix-project>
```

Pretty isn't it? As development demands increased post-acquisition it was a real challenge to both maintain these mission-critical CI systems and extend them with new service verification needs. Our product was scaling up as we integrated with the IBM Cloud ecosystem and starting in 2017 the IBM Cloudant team set out to make major improvements to our integration approach.

## Enter Jenkins Pipeline

Our approach of tracking Jenkins job business logic in the Chef-rendered XML templates was cumbersome for new developers to learn and difficult to extend. Important components embedded in the XML files were not accessible for individual execution, testing, or static analysis. However, a new approach to Jenkins CI implementation had emerged in recent years, known as [Jenkins Pipeline](https://jenkins.io/doc/book/pipeline/).

A different model had gained popularity in the past couple of years which expresses a project's build/test/deploy stages with assets tracked in the project's repo, using a Jenkins Pipeline. The cost to benefit ratio was paying itself back from the day it was introduced. Pipeline expresses the CI stages in a Domain Specific Language or DSL, which, being tracked in the repo, is much more natural for developers to maintain. Scripts can be included alongside the CI definition which will allow us to execute them individually, test them, etc. The same XML template, shown above, could be rendered using DSL (Groovy) like so. Please note the mapping between this example and that of the XML template is approximate as we have been since extending and updating our pipeline.  

```groovy
 stage("Build - ${name} ${variant}") {
        sh """
            export PATH=/opt/erlang/OTP-${erl_version()}/bin:$PATH

            make compile"""
    }

    try {
        stage("EUnit Test Suite - ${name} ${variant}") {
            sh """
                export PATH=/opt/erlang/OTP-${erl_version()}/bin:$PATH

                make check"""
        }

        stage("Dialyzer Type Check - ${name} ${variant}") {
            sh """
                export PATH=/opt/erlang/OTP-${erl_version()}/bin:$PATH

                make type-check"""
        }

        stage("Elixir Tests - ${name} ${variant}") {
            installElixir()
            installHaproxy()
            sh """
                export PATH=/usr/sbin:/usr/sbin/haproxy:/opt/erlang/OTP-${erl_version()}/bin:$PATH

                python3 dev/run -n 1 -a adm:pass --no-eval elixir/run || true"""
        }
    } finally {
        junit "src/**/.eunit/*.xml"
    }

    stage("Prepare build artifacts for persistence" - ${name} ${variant}") {
        // This is just a handy metadata file
        def propspath = "rel/dbcore/releases/${buildNumber}/build.props"
        def props = """\
            builder: ${name}
            variant: ${variant}
            sha: ${BUILD_COMMIT}
            branch: ${env.BRANCH_NAME}
            erlang: ${erl_version()}
            """.stripIndent()
        writeFile file: propspath, text: props

        if (env.BRANCH_NAME == "master") {
            sh """
                export PATH=/opt/erlang/OTP-${erl_version()}/bin:$PATH
                make BUILD_NUMBER=${buildNumber} BRANCH=${env.BRANCH_NAME} branch
                make BUILD_NUMBER=${buildNumber} BRANCH=${env.BRANCH_NAME} latest"""
        } else {
            sh """
            export PATH=/opt/erlang/OTP-${erl_version()}/bin:$PATH
            make BUILD_NUMBER=${buildNumber} BRANCH=${env.BRANCH_NAME} branch"""
        }
    }
    stage ("Triggering Fileserver Deploy for ${platform}") {
        if ("$env.TRIGGER_DOWNSTREAM_JOB".toBoolean() || env.BRANCH_NAME == "master") {
            build job: 'db-fileservers-deploy',
                parameters: [
                    [$class: 'StringParameterValue', name: 'DB_BUILD_NUMBER', value: "${buildNumber}"],
                    [$class: 'StringParameterValue', name: 'BUILD_BRANCH', value: "${env.BRANCH_NAME}"],
                    [$class: 'BooleanParameterValue', name: 'TRIGGER_DOWNSTREAM_JOB', value: false],
                    [$class: 'StringParameterValue', name: 'PLATFORM', value: "${platform}"]
                ],
                wait: true
        } else {
            echo "Not triggering file server deploy jobs."
        }
    }
}
```

It's immediately clear that the Pipeline scripted language approach is natural for developers to use. Engineers don't have to maintain complex or error-prone XML templates. One of the greatest benefits of adopting the Pipeline DSL has been the buy-in our team received from the wider developer community in our organization. From the beginning our team members have been able to skill up on the Pipeline DSL and become immediately productive.

Automation achieved with our new pipeline helped us to alleviate previously laborious manual testing. One example of this is shown by what we call the "poker" test. During this test our team would manually run a script that was developed to open and close databases as quickly as possible. While that script would run we would open a new shell and attempt to upgrade our database to a new release candidate version for testing. We would manually inspect all the results as this was all running in the background. 

Manual Steps
------
Run Poker Script --> Upgrade Cluster --> Verify Test Success

With our pipeline we were able to encapsulate all of this testing logic into a Docker container and execute the testing steps via a Jenkins Groovy File as shown below. By encapsulating the test and upgrade tooling in Docker containers we were firstly able to simplify build system dependency management. Secondly we were able to easily use these resources from a Jenkins Groovy/Pipeline workflow as shown below.

```groovy
try {
    echo 'Starting Rawhide execution...'
    if(env.USE_THOTH_RAWHIDE == 'true'){
        json_options_map = [
            'flags_list': ['--no-change-request', '--skip-prompts']
        ]
        if (env.RAWHIDE_HEALTH_CHECKS)
            json_options_map['-c'] = env.RAWHIDE_HEALTH_CHECKS_TIMEOUT
        else
            json_options_map['flags_list'].add('--disable-health-checks')
            rawhide_result = send_request_to_thoth('upgrade', env.POKER_CLUSTER, env.POKER_UPGRADE_VERSION, json_options_map)
    }
    else {
        docker.image('docker-registry-master.cloudant.com/rawhide').inside("-v /home/jenkins:/home/jenkins") {
            if ("$env.RAWHIDE_HEALTH_CHECKS".toBoolean()) {
                rawhide_result = sh script: "/bin/bash -c 'rawhide upgrade dbcore --internodal-health-check --skip-prompts --no-change-request -c $env.RAWHIDE_HEALTH_CHECKS_TIMEOUT $env.POKER_UPGRADE_VERSION $env.POKER_CLUSTER'", returnStatus: true
            } else {
                echo 'Skipping preflight/post-upgrade health checks...'
                    rawhide_result = sh script: "/bin/bash -c 'rawhide upgrade dbcore --disable-health-checks --skip-prompts --no-change-request $env.POKER_UPGRADE_VERSION $env.POKER_CLUSTER'", returnStatus: true
            }
        }
    }
```

You can see from the Jenkinsfile the syntax is developer friendly and follows a readable flow from running a script to reading out to a Docker registry for our images and upgrading our cluster.

The parallel use of both Docker and Jenkins Pipeline is another valuable asset to our CI that cannot be overlooked. It has allowed us to containerize our CI assets such that our execution is cleaner and our assets are stored within images. Dockerization allows us to isolate the deployment complexities of tool dependencies within the image rather than the actual build machines. By using Docker volumes we are able to contain any tooling/configuration needed.

So where do we go from here? The latest journey for our team is to move to a Tools-As-A-Service (TaaS) model and mirror our entire pipeline sequence. Effectively this will allow us to move to a hosted Jenkins service rather than maintainig our own instance. In addition to Jenkins, our IBM TaaS includes other IBM offerings such as UrbanCode Deploy for automating application deployments and Artifactory to serve as a repository manager. We hope in the next few months to be able to add further automation to our pipeline, some exciting updates would include automating our custom test report for management/stakeholders/other testers to easily consume our testing results and git tagging our builds. 

This journey thus far has led to us to a point that gives us confidence in our ability to validate whole-stack inegration and component correctness. Through our use of Jenkins Pipelines we've been able to do just that with easy-to-read Jenkins DSL and our dockerization of assets and configuration. This is an approach that we encourage any enterprise to employ as part of their development life-cycle.
