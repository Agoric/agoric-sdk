import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import { V } from '@agoric/vow/vat.js';
import { makeHeapZone } from '@agoric/zone';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeIssuerKit } from '@agoric/ertp';
import { makeResumableAgoricNamesHack } from '../../src/exos/agoric-names-tools.js';
import { commonSetup } from '../supports.js';

test('agoric names tools', async t => {
  const {
    bootstrap: { agoricNames, agoricNamesAdmin, bankManager, vowTools },
    brands: { ist },
  } = await commonSetup(t);

  const zone = makeHeapZone();
  const agNamesTools = makeResumableAgoricNamesHack(zone, {
    agoricNames,
    vowTools,
  });

  const chainEntry = await V.when(agNamesTools.lookup('chain', 'celestia'));
  t.like(chainEntry, { chainId: 'celestia' });

  const istDenom = await V.when(agNamesTools.findBrandInVBank(ist.brand));
  t.like(istDenom, { denom: 'uist' });

  const moolah = withAmountUtils(makeIssuerKit('MOO'));

  await t.throwsAsync(V.when(agNamesTools.findBrandInVBank(moolah.brand)), {
    message: /brand(.*?)not in agoricNames.vbankAsset/,
  });

  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    'umoo',
    /** @type {AssetInfo} */ harden({
      brand: moolah.brand,
      issuer: moolah.issuer,
      issuerName: 'MOO',
      denom: 'umoo',
      proposedName: 'MOO',
      displayInfo: { decimals: 6, symbol: 'MOO' },
    }),
  );

  t.like(
    await V.when(agNamesTools.findBrandInVBank(moolah.brand)),
    { denom: 'umoo' },
    'refresh stale cache for new assets',
  );
});
