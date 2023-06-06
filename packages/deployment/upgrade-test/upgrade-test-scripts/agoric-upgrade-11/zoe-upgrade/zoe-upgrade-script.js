// @ts-no-check
/* global E */

// to turn on ts-check:
// Xmport { E } from '@endo/far';

console.info('zoe upgrade: evaluating script');

/**
 * Test "upgrading" zoe.
 * It's a so-called "null" upgrade, since we don't mean to change the code.
 * This (re-)uses the code originally bundled at swingset bootstrap.
 *
 * @param { BootstrapPowers } powers
 */
const restartZoe = async powers => {
  console.info('restartZoe()');
  const {
    consume: { vatStore, vatAdminSvc },
  } = powers;
  console.info('restartZoe - destructured powers');

  const bundleName = 'zoe';
  const bundleCap = await E(vatAdminSvc).getNamedBundleCap(bundleName);
  const { adminNode } = await E(vatStore).get('zoe');
  console.info('restartZoe', { bundleName, bundleCap, adminNode });

  const result = await E(adminNode).upgrade(bundleCap, {});
  console.info('restartZoe', { result });
};

restartZoe;
