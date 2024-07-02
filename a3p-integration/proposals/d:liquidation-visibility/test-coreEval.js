import test from 'ava';
import {
  executeCommand,
  makeFileRW, passCoreEvalProposal,
  readBundles
} from "@agoric/synthetic-chain";
import { copyAll, makeTestContext } from "./core-eval-support.js";
import * as path from "path";
import * as fsp from "fs/promises";

/**
 * @file This file is intended for building and testing individual
 * proposals. Use config to indicate the proposal you want to test.
 *
 */

const config = {
  propRoot: '',
  script: '',
  prop: '',
  generatedScript: '',
  installer: '',
}

test.before(async t => {
  t.context = await makeTestContext({ testConfig: config });
})

test.serial('build prop', async t => {
  const propDir = makeFileRW(config.propRoot, { fsp, path });
  const assetDir = propDir.join('assets');

  try {
    await assetDir.rmdir();
  } catch (e) {
    t.log('Assets do not exist');
  } finally {
    await assetDir.mkdir();
  }

  await copyAll([
    {
      src: `${propDir.toString()}/${config.prop}`,
      dest: `/usr/src/agoric-sdk/packages/inter-protocol/${config.prop}`
    },
    {
      src: `${propDir.toString()}/${config.script}`,
      dest: `/usr/src/agoric-sdk/packages/inter-protocol/${config.script}`
    },
  ], { fsp });

  await executeCommand('agoric run', [`/usr/src/agoric-sdk/packages/inter-protocol/${config.script}`], {
    cwd: `${assetDir.toString()}`,
  });

  const fundStarsRW = assetDir.join(config.generatedScript);
  const fundStarsContent = await fundStarsRW.readOnly().readText();
  const bundleHash = fundStarsContent.match(/b1-[a-z0-9]+/g);

  await copyAll([
    {
      src: `/root/.agoric/cache/${bundleHash}.json`,
      dest: `${assetDir.toString()}/${bundleHash}.json`,
    }
  ], { fsp });

  t.log(bundleHash);
  t.pass();
});

test.serial('send prop', async t => {
  const bundleInfos = await readBundles(`${config.propRoot}/assets`);
  await passCoreEvalProposal(
    bundleInfos,
    { title: `Core eval of fund stars`, ...config}
  );
  t.log(bundleInfos);
  t.pass();
})