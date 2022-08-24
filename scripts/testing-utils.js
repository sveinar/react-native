/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict';

const {exec} = require('shelljs');
const os = require('os');
const {spawn} = require('node:child_process');

/*
 * Android related utils - leverages adb
 */

// this code is taken from the CLI repo, slightly readapted to our needs
// here's the reference folder:
// https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android/src/commands/runAndroid

const emulatorCommand = process.env.ANDROID_HOME
  ? `${process.env.ANDROID_HOME}/emulator/emulator`
  : 'emulator';

// const adbCommand = process.env.ANDROID_HOME
//   ? `${process.env.ANDROID_HOME}/platform-tools/adb`
//   : 'adb';

// /**
//  * Parses the output of the 'adb devices' command
//  */
// function parseDevicesResult(result) {
//   if (!result) {
//     return [];
//   }

//   const devices = [];
//   const lines = result.trim().split(/\r?\n/);

//   for (let i = 0; i < lines.length; i++) {
//     const words = lines[i].split(/[ ,\t]+/).filter(w => w !== '');

//     if (words[1] === 'device') {
//       devices.push(words[0]);
//     }
//   }
//   return devices;
// }

// /**
//  * Executes the commands needed to get a list of devices from ADB
//  */
// function getDevices() {
//   try {
//     const devicesResult = exec(`"${adbCommand}" devices`).stdout;
//     return parseDevicesResult(devicesResult.toString());
//   } catch (e) {
//     return [];
//   }
// }

const getEmulators = () => {
  const emulatorsOutput = exec(`${emulatorCommand} -list-avds`).stdout;
  return emulatorsOutput.split(os.EOL).filter(name => name !== '');
};

const launchEmulator = async emulatorName => {
  console.log(`Launching emulator ${emulatorName}`);
  // exec(`${emulatorCommand} -avd ${emulatorName}`, {async: true});
  // spawn(`${emulatorCommand} -avd ${emulatorName}`, [], {detached: true});
};

function tryLaunchEmulator() {
  const emulators = getEmulators();
  console.log('emulators', emulators);
  if (emulators.length > 0) {
    try {
      launchEmulator(emulators[0]);

      return {success: true};
    } catch (error) {
      return {success: false, error};
    }
  }
  return {
    success: false,
    error: 'No emulators found as an output of `emulator -list-avds`',
  };
}

function launchAndroidEmulator() {
  const result = tryLaunchEmulator();
  if (result.success) {
    console.info('Successfully launched emulator.');
  } else {
    console.error(`Failed to launch emulator. Reason: ${result.error || ''}.`);
    console.warn(
      'Please launch an emulator manually or connect a device. Otherwise app may fail to launch.',
    );
  }
}

module.exports = {
  launchAndroidEmulator,
};
