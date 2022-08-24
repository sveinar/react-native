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

const {echo, exec, exit, pwd} = require('shelljs');
const yargs = require('yargs');
const {launchAndroidEmulator} = require('./testing-utils');

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

// command order: we ask the user to select if they want to test RN tester
// or RNTestProject

// if they select RN tester, we ask if iOS or Android, and then we run the tests
// if they select RNTestProject, we run the RNTestProject test

if (argv.target === 'RNTester') {
  if (argv.platform === 'iOS') {
    if (argv.hermes) {
      console.info("We're going to test the Hermes version of RNTester iOS");
    } else {
      console.info("We're going to test the JSC version of RNTester iOS");
    }
  } else {
    // we do the android path here

    launchAndroidEmulator();
    if (argv.hermes) {
      console.info(
        "We're going to test the Hermes version of RNTester Android",
      );
      exec('./gradlew :packages:rn-tester:android:app:installHermesDebug');
    } else {
      console.info("We're going to test the JSC version of RNTester Android");
      exec('./gradlew :packages:rn-tester:android:app:installJscDebug');
    }
    exec('adb shell am start -n com.facebook.react.uiapp/.RNTesterActivity');
  }
} else {
  console.info("We're going to test a fresh new RN project");
}

exit(0);
