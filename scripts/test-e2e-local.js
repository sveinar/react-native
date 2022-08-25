/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict';

/*
 * This script is a re-interpretation of the old test-manual.e2e.sh script.
 * the idea is to provide a better DX for the manual testing.
 * It's using Javascript over Bash for consistency with the rest of the recent scripts
 * and to make it more accessible for other devs to play around with.
 */

const {exec, exit, pushd, popd, pwd} = require('shelljs');
const yargs = require('yargs');

const {
  launchAndroidEmulator,
  isPackagerRunning,
  launchPackagesInSeparateWindow,
} = require('./testing-utils');

const {generateAndroidArtifacts} = require('./release-utils');

// const {isReleaseBranch, parseVersion} = require('./version-utils');

const argv = yargs
  .option('t', {
    alias: 'target',
    default: 'RNTester',
    choices: ['RNTester', 'RNTestProject'],
  })
  .option('p', {
    alias: 'platform',
    default: 'iOS',
    choices: ['iOS', 'Android'],
  })
  .option('h', {
    alias: 'hermes',
    type: 'boolean',
    default: true,
  }).argv;

/* we probably want some form of cleanup ahead of running the command
 * things to consider:
 *  - clean up node modules
 *  - clean up the build folder (derived data, gradlew cleanAll)
 *  - clean up the pods folder (pod install) (and Podfile.lock too)
 *  - kill all packagers
 *
 * other improvements to consider:
 *   - an option to uninstall the app from emulators
 */

// command order: we ask the user to select if they want to test RN tester
// or RNTestProject

// if they select RN tester, we ask if iOS or Android, and then we run the tests
// if they select RNTestProject, we run the RNTestProject test

// let's check if Metro is already running, if it is let's kill it and start fresh
if (isPackagerRunning() === 'running') {
  exec("lsof -i :8081 | grep LISTEN | /usr/bin/awk '{print $2}' | xargs kill");
}

console.log('argv', argv);

if (argv.target === 'RNTester') {
  //FIXME: make sure that the commands retains colors
  // (--ansi) doesn't always work
  // see also https://github.com/shelljs/shelljs/issues/86

  if (argv.platform === 'iOS') {
    if (argv.hermes) {
      console.info("We're going to test the Hermes version of RNTester iOS");
      exec(
        'cd packages/rn-tester && USE_HERMES=1 bundle exec pod install --ansi',
      );
    } else {
      console.info("We're going to test the JSC version of RNTester iOS");
      exec(
        'cd packages/rn-tester && USE_HERMES=0 bundle exec pod install --ansi',
      );
    }

    // if everything succeeded so far, we can launch Metro and the app
    // start the Metro server in a separate window
    launchPackagesInSeparateWindow();

    // launch the app on iOS simulator
    pushd('packages/rn-tester');
    exec('npx react-native run-ios --scheme RNTester');
    popd();
  } else {
    // we do the android path here

    launchAndroidEmulator();

    if (argv.hermes) {
      console.info(
        "We're going to test the Hermes version of RNTester Android",
      );
      exec(
        './gradlew :packages:rn-tester:android:app:installHermesDebug --quiet',
      );
    } else {
      console.info("We're going to test the JSC version of RNTester Android");
      exec('./gradlew :packages:rn-tester:android:app:installJscDebug --quiet');
    }

    // if everything succeeded so far, we can launch Metro and the app
    // start the Metro server in a separate window
    launchPackagesInSeparateWindow();
    // just to make sure that the Android up won't have troubles finding the Metro server
    exec('adb reverse tcp:8081 tcp:8081');
    // launch the app
    exec(
      'adb shell am start -n com.facebook.react.uiapp/com.facebook.react.uiapp.RNTesterActivity',
    );
  }
} else {
  console.info("We're going to test a fresh new RN project");

  // remove the old project & archive if exists
  exec('rm -rf /tmp/RNTestProject');
  exec('rm -f ./*.tgz');

  // create the local npm package to feed the CLI

  // we need to add the unique timestamp to avoid npm/yarn to use some local caches
  const baseVersion = require('../package.json').version;

  const dateIdentifier = new Date()
    .toISOString()
    .slice(0, -8)
    .replace(/[-:]/g, '')
    .replace(/[T]/g, '-');

  const releaseVersion = `${baseVersion}-${dateIdentifier}`;

  // this is needed to generate the Android artifacts correctly
  // FIXME: the problem is that this also causes the Hermes on iOS side to crash on pod install
  // the problem is that it tries to pull down Hermes from GH Release of a version that doesn't exist yet
  // need to check with cortinico how the current script manages to avoid this issue
  // TODO: get back in main branch proper, test old script, see what is different in generation
  exec(`node scripts/set-rn-version.js --to-version ${releaseVersion}`).code;

  // Generate native files (Android only for now)
  generateAndroidArtifacts(releaseVersion);

  // create locally the node module
  exec('npm pack');

  const localNodeTGZPath = `${pwd()}/react-native-${releaseVersion}.tgz`;
  exec(`node scripts/set-rn-template-version.js "file:${localNodeTGZPath}"`);

  const repoRoot = pwd();

  pushd('/tmp/');
  // need to avoid the pod install step because it will fail! (see above)
  exec(`node ${repoRoot}/cli.js init RNTestProject --template ${repoRoot}`);
  popd();

  // now we can generate the new project via the CLI
  console.info(
    'New sample project correctly generated at /tmp/RNTestProject. Go test it out!',
  );

  // TODO: we need to add the ability to test the Android/iOS versions of the project

  // at the end here I most likely want to set back the rn version to baseVersion!
  // for git "cleanness" reasons
  exec(`node scripts/set-rn-template-version.js ${baseVersion}`);
}

exit(0);
