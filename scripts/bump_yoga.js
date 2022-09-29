#!/usr/bin/env node
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict';

/**
 * This script bumps a new version for open source releases.
 * It updates the version in json/gradle files and makes sure they are consistent between each other
 * After changing the files it makes a commit and tags it.
 * All you have to do is push changes to remote and CI will make a new build.
 */
const fs = require('fs');
const { cat, echo, exec, exit, sed } = require('shelljs');
const yargs = require('yargs');

let argv = yargs
  .option('r', {
    alias: 'remote',
    default: 'origin',
  })
  .option('n', {
    alias: 'nightly',
    type: 'boolean',
    default: false,
  }).argv;

let [, major, minor, patch, prerelease] = ["", "0", "64", "2", "yoga2"];

fs.writeFileSync(
  'ReactAndroid/src/main/java/com/facebook/react/modules/systeminfo/ReactNativeVersion.java',
  cat('scripts/versiontemplates/ReactNativeVersion.java.template')
    .replace('${major}', major)
    .replace('${minor}', minor)
    .replace('${patch}', patch)
    .replace(
      '${prerelease}',
      prerelease !== undefined ? `"${prerelease}"` : 'null',
    ),
  'utf-8',
);

fs.writeFileSync(
  'React/Base/RCTVersion.m',
  cat('scripts/versiontemplates/RCTVersion.m.template')
    .replace('${major}', `@(${major})`)
    .replace('${minor}', `@(${minor})`)
    .replace('${patch}', `@(${patch})`)
    .replace(
      '${prerelease}',
      prerelease !== undefined ? `@"${prerelease}"` : '[NSNull null]',
    ),
  'utf-8',
);

fs.writeFileSync(
  'ReactCommon/cxxreact/ReactNativeVersion.h',
  cat('scripts/versiontemplates/ReactNativeVersion.h.template')
    .replace('${major}', major)
    .replace('${minor}', minor)
    .replace('${patch}', patch)
    .replace(
      '${prerelease}',
      prerelease !== undefined ? `"${prerelease}"` : '""',
    ),
  'utf-8',
);

fs.writeFileSync(
  'Libraries/Core/ReactNativeVersion.js',
  cat('scripts/versiontemplates/ReactNativeVersion.js.template')
    .replace('${major}', major)
    .replace('${minor}', minor)
    .replace('${patch}', patch)
    .replace(
      '${prerelease}',
      prerelease !== undefined ? `'${prerelease}'` : 'null',
    ),
  'utf-8',
);

let version = "0.64.2-yoga-2"
let packageJson = JSON.parse(cat('package.json'));
packageJson.version = version;
delete packageJson.workspaces;
delete packageJson.private;
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2), 'utf-8');

// Change ReactAndroid/gradle.properties
if (
  sed(
    '-i',
    /^VERSION_NAME=.*/,
    `VERSION_NAME=${version}`,
    'ReactAndroid/gradle.properties',
  ).code
) {
  echo("Couldn't update version for Gradle");
  exit(1);
}

// Change react-native version in the template's package.json
exec(`node scripts/set-rn-template-version.js ${version}`);

exit(0);
