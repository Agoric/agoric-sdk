/* global harden */
import '@agoric/install-ses';
import bundleSource from '@agoric/bundle-source';
import { importBundle } from '@agoric/import-bundle';
import { makeMeter, makeMeteringTransformer, makeMeteredEvaluator } from '@agoric/transform-metering';
import tap from 'tap';

/*
tap.test('metering within a vat', async function withinVat(t) {
  const bundle = await bundleSource(require.resolve('./metered-code.js'),
                                    'nestedEvaluate');
  harden(console.__proto__);
  // importBundle requires a 'require', even if nothing uses it
  const endowments = { require: what => 0, console };

  const ns = await importBundle(bundle, { endowments, transforms });
  const stuff = ns.default;
  stuff(false);
  console.log(`about to spin`);
  stuff(true);
  console.log(`finished infinite loop in record time`);
});
*/

tap.test('metering of an entire vat', async function entireVat(t) {

});
