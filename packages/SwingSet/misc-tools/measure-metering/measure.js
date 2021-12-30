// run as `node tools/measure-metering/measure.js`

// eslint-disable-next-line import/order
import '../prepare-test-env.js';

// eslint-disable-next-line import/order
import bundleSource from '@agoric/bundle-source';
import { xsnap } from '@agoric/xsnap';
import * as proc from 'child_process';
import * as os from 'os';
import { buildVatController } from '../../src/index.js';
import { capargs } from '../../test/util.js';

function countingPolicy() {
  let computrons = 0n;
  const policy = harden({
    vatCreated() {
      return true;
    },
    crankComplete(details = {}) {
      // console.log(`crankComplete`, details);
      assert.typeof(details, 'object');
      if (details.computrons) {
        assert.typeof(details.computrons, 'bigint');
        computrons += details.computrons;
      }
      return true;
    },
    crankFailed() {
      return true;
    },

    counted() {
      return computrons;
    },
  });
  return policy;
}

async function run() {
  const x = xsnap({ os: os.type(), spawn: proc.spawn });
  const res = await x.evaluate('4');
  const { meterType } = res.meterUsage;
  console.log(`meterType: ${meterType}`);
  await x.terminate();

  const bootFn = new URL('measurement-bootstrap.js', import.meta.url).pathname;
  const targetFn = new URL('measurement-target.js', import.meta.url).pathname;
  const zoeFn = new URL('measurement-zoe.js', import.meta.url).pathname;
  const autoswapFn = new URL(
    '../../../run-protocol/src/vpool-xyk-amm/multipoolMarketMaker.js',
    import.meta.url,
  ).pathname;
  const autoswapBundle = await bundleSource(autoswapFn);
  const config = {
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: bootFn,
      },
      zoe: {
        sourceSpec: zoeFn,
      },
    },
    bundles: {
      target: {
        sourceSpec: targetFn,
      },
    },
  };

  const c = await buildVatController(config);
  c.pinVatRoot('bootstrap');

  await c.run();

  async function runOneMode(mode) {
    const kp = c.queueToVatRoot('bootstrap', 'measure', capargs([mode]));
    await c.run();
    const cd = c.kpResolution(kp);
    const used = JSON.parse(cd.body);
    assert.typeof(used, 'number');
    return used;
  }

  // discard the first message, which for some reason uses ~350 more
  await runOneMode('empty');
  const empty = await runOneMode('empty');
  console.log(`empty (baseline): ${empty}`);

  const asyncEmpty = await runOneMode('asyncEmpty');
  console.log(` add async: ${asyncEmpty - empty}`);
  const init = await runOneMode('init');
  console.log(`"let i = 1": ${init - empty}`);
  const add = await runOneMode('add');
  console.log(`"i += 2": ${add - init}`);
  const loop100 = await runOneMode('loop100');
  console.log(
    `"let sum; for (let i=0; i<100; i++) { sum += i; }": ${loop100 - empty}`,
  );
  const loop1000 = await runOneMode('loop1000');
  console.log(`  same but to 1000: ${loop1000 - empty}`);

  const makeCounter = await runOneMode('makeCounter');
  console.log(`define Far add/read counter object: ${makeCounter - empty}`);
  const counterAdd = await runOneMode('counterAdd');
  console.log(`  "counter.add(1)": ${counterAdd - empty}`);

  const log = await runOneMode('log');
  console.log(`"console.log('')": ${log - empty}`);

  const makeIssuer = await runOneMode('makeIssuer');
  console.log(`makeIssuerKit: ${makeIssuer - empty}`);
  const getBrand = await runOneMode('getBrand');
  console.log(`getBrand: ${getBrand - empty}`);
  const getCurrentAmount = await runOneMode('getCurrentAmount');
  console.log(`getCurrentAmount: ${getCurrentAmount - empty}`);
  const deposit = await runOneMode('deposit');
  console.log(`deposit: ${deposit - empty}`);
  const getUpdateSince = await runOneMode('getUpdateSince');
  console.log(`getUpdateSince: ${getUpdateSince - empty}`);

  // Zoe is in a static vat, so to measure Zoe's usage, we ask the runPolicy
  // how many computrons it was asked about, rather than following the Meter
  // of the target vat.

  async function doCounted(method, args = []) {
    const kp = c.queueToVatRoot('bootstrap', method, capargs(args));
    const p = countingPolicy();
    await c.run(p);
    c.kpResolution(kp);
    const counted = p.counted();
    return Number(counted);
  }
  const zoeInstallVaultFactory = await doCounted('zoeInstallVaultFactory');
  console.log(`zoe install (vaultFactory): ${zoeInstallVaultFactory}`);

  const zoeInstallAMM = await doCounted('zoeInstallBundle', [autoswapBundle]);
  console.log(`zoe install (AMM): ${zoeInstallAMM}`);
  const zoeInstantiate = await doCounted('zoeInstantiate');
  console.log(`zoe instantiate (AMM): ${zoeInstantiate}`);

  await c.shutdown();
}

run().catch(err => console.log('error in run:', err));
