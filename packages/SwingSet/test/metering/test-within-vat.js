import '@agoric/install-metering-and-ses';
import bundleSource from '@agoric/bundle-source';
import test from 'ava';
import { buildVatController } from '../../src/index';
import makeNextLog from '../make-nextlog';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

const localOnlyForNow = { defaultManagerType: 'local' };

test('metering within a vat', async t => {
  // we'll give this bundle to the vat, which will import it under metering
  const bundle = await bundleSource(require.resolve('./metered-code.js'));
  const config = {
    vats: {
      within: {
        sourceSpec: require.resolve('./vat-within.js'),
      },
    },
  };
  const c = await buildVatController(config, [], localOnlyForNow);
  const nextLog = makeNextLog(c);

  // 'start' will import the bundle
  c.queueToVatExport('within', 'o+0', 'start', capargs([bundle]));
  await c.run();
  t.deepEqual(nextLog(), ['importing', 'imported'], 'bundled imported');

  // 'run(no)' invokes the bundle in non-exhausting mode
  c.queueToVatExport('within', 'o+0', 'run', capargs(['no']));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run no', 'log2: started done', 'no exception'],
    'non-exhausting mode ok',
  );

  // 'run(allocate)' tells the bundle to build an oversized array. If the
  // globals have been successfully instrumented, this will fire the global
  // 'ALLOCATE' meter. If not, the `Array(4e9)` will succeed, because Array
  // is lazy that way.
  c.queueToVatExport('within', 'o+0', 'run', capargs(['allocate']));
  await c.run();
  t.deepEqual(
    nextLog(),
    [
      'run allocate',
      'log2: started',
      'exception (RangeError: Allocate meter exceeded)',
    ],
    'allocate meter exhausted',
  );

  // Now the meter should be exhausted, so running any code will fire it
  // again right away, before it even gets started. The exhaustion is
  // "sticky" until the meter is refilled.
  c.queueToVatExport('within', 'o+0', 'run', capargs(['no']));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run no', 'log2: ', 'exception (RangeError: Allocate meter exceeded)'],
    'allocate meter is sticky',
  );

  // refilling the ALLOCATE meter should fix that
  c.queueToVatExport('within', 'o+0', 'refill', capargs(['allocate']));
  c.queueToVatExport('within', 'o+0', 'run', capargs(['no']));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run no', 'log2: started done', 'no exception'],
    'allocate meter refilled',
  );

  // 'run(stack)' triggers infinite recursion. If metering is active, this
  // will raise an exception that cannot be caught by the metered code, so
  // control will land back in the vat's run() method. If metering is not
  // active, Node.js will throw a RangeError, which will be caught by the
  // metered code, which will push a 'log2: caught' message.
  c.queueToVatExport('within', 'o+0', 'run', capargs(['stack']));
  await c.run();
  t.deepEqual(
    nextLog(),
    [
      'run stack',
      'log2: started',
      'exception (RangeError: Stack meter exceeded)',
    ],
    'stack meter exhausted',
  );

  // again, the exhaustion is sticky
  c.queueToVatExport('within', 'o+0', 'run', capargs(['no']));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run no', 'log2: ', 'exception (RangeError: Stack meter exceeded)'],
    'stack meter is sticky',
  );
  c.queueToVatExport('within', 'o+0', 'refill', capargs(['stack']));
  c.queueToVatExport('within', 'o+0', 'run', capargs(['no']));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run no', 'log2: started done', 'no exception'],
    'stack meter refilled',
  );

  // 'run(compute)' triggers an infinite loop. If metering is active, this
  // will raise a meter-exhausted exception. If it is not, this will run
  // forever and hang the process.
  c.queueToVatExport('within', 'o+0', 'run', capargs(['compute']));
  await c.run();
  t.deepEqual(
    nextLog(),
    [
      'run compute',
      'log2: started',
      'exception (RangeError: Compute meter exceeded)',
    ],
    'compute meter exhausted',
  );

  // again, the exhaustion is sticky
  c.queueToVatExport('within', 'o+0', 'run', capargs(['no']));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run no', 'log2: ', 'exception (RangeError: Compute meter exceeded)'],
    'compute meter is sticky',
  );
  c.queueToVatExport('within', 'o+0', 'refill', capargs(['compute']));
  c.queueToVatExport('within', 'o+0', 'run', capargs(['no']));
  await c.run();
  t.deepEqual(
    nextLog(),
    ['run no', 'log2: started done', 'no exception'],
    'compute meter refilled',
  );
});
