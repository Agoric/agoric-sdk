// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';

import bundleSource from '@endo/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoeKit } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeCopyBag } from '@agoric/store';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const attestationRoot = `${dirname}/../../src/attestation/attestation.js`;

/**
 * @param {Brand} uBrand
 * @param {*} t
 * @returns {StakingAuthority}
 */
export const makeMockLienBridge = (uBrand, t) => {
  const currentTime = 10n;
  const liened = new Map();
  return Far('stakeReporter', {
    getAccountState: (address, _brand) => {
      return harden({
        total: AmountMath.make(uBrand, 500n),
        bonded: AmountMath.make(uBrand, 200n),
        locked: AmountMath.make(uBrand, 10n),
        liened: liened.get(address),
        unbonding: AmountMath.make(uBrand, 0n),
        currentTime,
      });
    },
    setLiened: async (address, amount) => {
      t.log('setLiened:', { address, amount });
      liened.set(address, amount);
    },
  });
};

const makeContext = async t => {
  const bundle = await bundleSource(attestationRoot);

  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);
  const installation = await E(zoe).install(bundle);

  const stakeKit = makeIssuerKit(
    'BLD',
    AssetKind.NAT,
    harden({
      decimalPlaces: 6,
    }),
  );
  const uBrand = stakeKit.brand;
  const uIssuer = stakeKit.issuer;

  /** @type {ReturnType<typeof import('../../src/attestation/attestation.js').makeAttestationFacets>} */
  const result = E(zoe).startInstance(
    installation,
    harden({ Underlying: uIssuer }),
    harden({
      returnableAttName: 'BldAttLoc',
    }),
  );
  const { publicFacet, creatorFacet } = await result;

  return {
    zoe,
    stakeKit,
    lienBridge: makeMockLienBridge(uBrand, t),
    publicFacet,
    creatorFacet,
  };
};

test.before(async t => {
  const properties = await makeContext(t);
  Object.assign(t.context, properties);
});

test('refuse to attest to more than liened amount', async t => {
  const { stakeKit, creatorFacet, lienBridge } =
    await /** @type { ReturnType<typeof makeContext> } */ (t.context);

  const uBrand = stakeKit.brand;
  await E(creatorFacet).addAuthority(lienBridge);

  const address1 = 'address01'; // note: keep addresses distinct among parallel tests

  const attMaker = await E(creatorFacet).getAttMaker(address1);

  const largeAmount = AmountMath.make(uBrand, 1000n);
  await t.throwsAsync(() => E(attMaker).makeAttestation(largeAmount), {
    message:
      'Only {"brand":"[Alleged: BLD brand]","value":"[500n]"} was unliened, but an attestation was attempted for {"brand":"[Alleged: BLD brand]","value":"[1000n]"}',
  });

  // check that no lien was successful so far
  const liened = await E(creatorFacet).getLiened(address1, uBrand);
  t.deepEqual(liened, AmountMath.makeEmpty(uBrand));
});

test('attestations can be combined and split', async t => {
  const { zoe, stakeKit, publicFacet, creatorFacet, lienBridge } =
    await /** @type { ReturnType<typeof makeContext> } */ (t.context);

  await E(creatorFacet).addAuthority(lienBridge);

  const issuer = await E(publicFacet).getIssuer();
  const brand = await E(publicFacet).getBrand();

  const address1 = 'address1';
  const attMaker = await E(creatorFacet).getAttMaker(address1);

  const uBrand = stakeKit.brand;
  const stake50 = AmountMath.make(uBrand, 50n);

  // Make a normal lien
  const attest50pmt = await E(attMaker).makeAttestation(stake50);
  const attest50amt = AmountMath.make(brand, makeCopyBag([[address1, 50n]]));
  t.deepEqual(await E(issuer).getAmountOf(attest50pmt), attest50amt);

  t.deepEqual(await E(creatorFacet).getLiened(address1, uBrand), stake50);

  // Make another normal lien
  const stake25 = AmountMath.make(uBrand, 25n);
  const attest25pmt = await E(attMaker).makeAttestation(stake25);

  t.deepEqual(
    await E(issuer).getAmountOf(attest25pmt),
    AmountMath.make(brand, makeCopyBag([['address1', 25n]])),
  );

  t.deepEqual(
    await E(creatorFacet).getLiened(address1, uBrand),
    AmountMath.add(stake50, stake25),
  );

  /** @param { Payment } att */
  const returnAttestation = async att => {
    const invitation = E(publicFacet).makeReturnAttInvitation();
    const attestationAmount = await E(issuer).getAmountOf(att);
    const proposal = harden({ give: { Attestation: attestationAmount } });
    const payments = harden({ Attestation: att });
    const userSeat = E(zoe).offer(invitation, proposal, payments);
    const payout = await E(userSeat).getPayouts();
    const amounts = await Promise.all(
      Object.values(payout).map(paymentP => E(issuer).getAmountOf(paymentP)),
    );
    t.true(amounts.every(amount => AmountMath.isEmpty(amount, brand)));
    return userSeat;
  };

  // split the 1st attestation
  const [attest20pmt, attestRestPmt] = await E(issuer).split(
    attest50pmt,
    AmountMath.make(brand, makeCopyBag([[address1, 20n]])),
  );

  // return 1st part
  await returnAttestation(attest20pmt);
  t.deepEqual(
    await E(creatorFacet).getLiened(address1, uBrand),
    AmountMath.make(uBrand, 55n),
  );

  // return 2nd part
  await returnAttestation(attestRestPmt);
  t.deepEqual(await E(creatorFacet).getLiened(address1, uBrand), stake25);

  // Return the original attestation for 25
  await returnAttestation(attest25pmt);

  // Now the liened Amount should be empty
  t.deepEqual(
    await E(creatorFacet).getLiened(address1, uBrand),
    AmountMath.makeEmpty(uBrand),
  );
});
