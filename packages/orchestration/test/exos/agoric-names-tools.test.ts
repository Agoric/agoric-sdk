import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { heapVowE as E } from '@agoric/vow/vat.js';
import { makeHeapZone } from '@agoric/zone';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeIssuerKit } from '@agoric/ertp';
import { AssetInfo } from '@agoric/vats/src/vat-bank.js';
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

  const chainEntry = await E.when(agNamesTools.lookup('chain', 'celestia'));
  t.like(chainEntry, { chainId: 'celestia' });

  const istDenom = await E.when(agNamesTools.findBrandInVBank(ist.brand));
  t.like(istDenom, { denom: 'uist' });

  const moolah = withAmountUtils(makeIssuerKit('MOO'));

  await t.throwsAsync(E.when(agNamesTools.findBrandInVBank(moolah.brand)), {
    message: /brand(.*?)not in agoricNames.vbankAsset/,
  });

  const mooToken: AssetInfo = {
    brand: moolah.brand,
    issuer: moolah.issuer,
    issuerName: 'MOO',
    denom: 'umoo',
    proposedName: 'MOO',
    displayInfo: { decimalPlaces: 6, assetKind: 'nat' },
  };

  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    'umoo',
    harden(mooToken),
  );
  t.like(
    await E.when(agNamesTools.findBrandInVBank(moolah.brand)),
    { denom: 'umoo' },
    'vbankAssets are refetched if brand is not found',
  );

  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    'umoo',
    harden({ ...mooToken, denom: 'umoo2' }),
  );
  t.like(
    await E.when(agNamesTools.findBrandInVBank(moolah.brand)),
    { denom: 'umoo' },
    'old AssetInfo is cached',
  );
  t.like(
    await E.when(agNamesTools.findBrandInVBank(moolah.brand, true)),
    { denom: 'umoo2' },
    'new AssetInfo is fetched when refetch=true',
  );
});
