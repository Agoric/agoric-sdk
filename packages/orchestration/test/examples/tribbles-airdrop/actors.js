import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import { accounts } from './data/agd-keys.js';
import { merkleTreeAPI } from '../../../src/examples/airdrop/merkle-tree/index.js';

const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?
const publicKeys = accounts.map(x => x.pubkey.key);

const makeMakeOfferArgs =
  (keys = publicKeys) =>
  ({ pubkey: { key = '' }, address = 'agoric12d3fault' }) => ({
    key,
    proof: merkleTreeAPI.generateMerkleProof(key, keys),
    address,
    tier: createTestTier(),
  });

/**
 * Eligible claimant exercises their right to claim tokens.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {ZoeService} zoe
 * @param {import('@agoric/zoe/src/zoeService/utils').Instance<Installation>} instance
 * @param {import('@agoric/ertp/src/types').Purse} feePurse
 * @param {{
 *   pubkey: { key: string; type: string };
 *   address: string;
 *   tier?: number;
 *   name?: string;
 *   type?: string;
 * }} accountObject
 * @param {boolean} shouldThrow boolean flag indicating whether or not the
 *   contract is expected to throw an error.
 * @param {string} errorMessage Error message produced by contract resulting
 *   from some error arising during the claiming process.
 * @param {Array} pubkeys Array of all public keys used when constructing the
 *   contract's merkle tree
 */
const simulateClaim = async (
  t,
  zoe,
  instance,
  feePurse,
  accountObject,
  shouldThrow = false,
  errorMessage = '',
  pubkeys = publicKeys,
) => {
  const [pfFromZoe, terms] = await Promise.all([
    E(zoe).getPublicFacet(instance),
    E(zoe).getTerms(instance),
  ]);

  const makeOfferArgs = makeMakeOfferArgs(pubkeys);

  const { brands, issuers } = terms;

  const claimOfferArgs = makeOfferArgs(accountObject);

  console.log('TERMS:::', { terms, claimOfferArgs });
  console.log(instance.instance);

  const proposal = {
    give: { Fee: AmountMath.make(brands.Fee, 5n) },
  };
  t.log('Alice gives', proposal.give);

  const feePayment = await E(feePurse).withdraw(
    AmountMath.make(brands.Fee, 5n),
  );
  const [invitation, payoutValues] = await Promise.all([
    E(pfFromZoe).makeClaimTokensInvitation(),
    E(pfFromZoe).getPayoutValues(),
  ]);

  if (!shouldThrow) {
    const seat = await E(zoe).offer(
      invitation,
      proposal,
      { Fee: feePayment },
      harden(claimOfferArgs),
    );
    const airdropPayout = await E(seat).getPayout('Tokens');

    const actual = await E(issuers.Tribbles).getAmountOf(airdropPayout);
    t.log('Alice payout brand', actual.brand);
    t.log('Alice payout value', actual.value);
    t.deepEqual(actual, payoutValues[claimOfferArgs.tier]);
  } else {
    const badSeat = E(zoe).offer(
      invitation,
      proposal,
      { Fee: feePayment },
      harden(claimOfferArgs),
    );
    await t.throwsAsync(E(badSeat).getOfferResult(), {
      message: errorMessage,
    });
  }
};

export { simulateClaim };
