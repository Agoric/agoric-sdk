import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { Offers } from '../src/clientSupport.js';
import { withAmountUtils } from './supports.js';

const ist = withAmountUtils(makeIssuerKit('IST'));
const atom = withAmountUtils(makeIssuerKit('ATOM'));
const stAtom = withAmountUtils(makeIssuerKit('stATOM'));

// uses actual Brand objects instead of BoardRemote to make the test output more legible
/**
 * @satisfies {Partial<
 *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes
 * >}
 */
const agoricNames = {
  brand: {
    IST: /** @type {any} */ (ist.brand),
    ATOM: /** @type {any} */ (atom.brand),
    stATOM: /** @type {any} */ (stAtom.brand),
  },
  vbankAsset: {
    uist: {
      denom: 'uist',
      brand: /** @type {any} */ (ist.brand),
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'IST',
      proposedName: 'Agoric stable token',
    },
    'ibc/toyatom': {
      denom: 'ibc/toyatom',
      brand: /** @type {any} */ (atom.brand),
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'ATOM',
      proposedName: 'ATOM',
    },
    'ibc/sttoyatom': {
      denom: 'ibc/sttoyatom',
      brand: /** @type {any} */ (stAtom.brand),
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
      issuer: /** @type {any} */ ({}),
      issuerName: 'stATOM',
      proposedName: 'stATOM',
    },
  },
};

test('Offers.reserve.AddCollateral', async t => {
  t.deepEqual(
    Offers.reserve.AddCollateral(agoricNames, {
      offerId: 'foo2',
      collateralBrandKey: 'ATOM',
      give: 123.45,
    }),
    {
      id: 'foo2',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['reserve'],
        callPipe: [['makeAddCollateralInvitation', []]],
      },
      proposal: { give: { Collateral: atom.make(123_450_000n) } },
    },
  );
});
