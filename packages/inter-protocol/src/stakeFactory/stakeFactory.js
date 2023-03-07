// @jessie-check
import { AmountMath } from '@agoric/ertp';
import { handleParamGovernance, ParamTypes } from '@agoric/governance';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { E, Far } from '@endo/far';
import { makeMakeCollectFeesInvitation } from '../collectFees.js';
import { makeAttestationFacets } from './attestation.js';
import { ManagerKW as KW } from './constants.js';
import { makeStakeFactoryKit } from './stakeFactoryKit.js';
import { makeStakeFactoryManager } from './stakeFactoryManager.js';

/**
 * Provide loans on the basis of staked assets that earn rewards.
 *
 * In addition to brands and issuers for `Staked`, `Minted`, and attestation,
 * terms of the contract include a periodic `InterestRate`
 * plus a `LoanFee` proportional to the amount borrowed, as well as
 * a `MintingRatio` of funds to (mint and) loan per unit of staked asset.
 * These terms are subject to change by the `Electorate`
 * and `electionManager` terms.
 *
 * @typedef {{
 *   DebtLimit: 'amount',
 *   MintingRatio: 'ratio',
 *   InterestRate: 'ratio',
 *   LoanFee: 'ratio',
 * }} StakeFactoryParams
 *
 * As in vaultFactory, `timerService` provides the periodic signal to
 * charge interest according to `chargingPeriod` and `recordingPeriod`.
 *
 * @typedef { GovernanceTerms<StakeFactoryParams> & {
 *   timerService: import('@agoric/time/src/types').TimerService,
 *   chargingPeriod: bigint,
 *   recordingPeriod: bigint,
 *   lienAttestationName?: string,
 * }} StakeFactoryTerms
 *
 * The public facet provides access to invitations to get a loan
 * or to return an attestation in order to release a lien on staked assets.
 *
 * @typedef {{
 *   makeLoanInvitation: () => Promise<Invitation>,
 *   makeReturnAttInvitation: () => Promise<Invitation>,
 * }} StakeFactoryPublic
 *
 * To take out a loan, get an `AttestationMaker` for your address from
 * the creator of this contract, and use
 * `E(attMaker).makeAttestation(stakedAmount)` to take out a lien
 * and get a payment that attests to the lien. Provide the payment
 * in the `Attestation` keyword of an offer,
 * using `{ want: { Debt: amountWanted }}`.
 *
 * Then, using the invitationMakers pattern, use `AdjustBalances` to
 * pay down the loan or otherwise adjust the `Debt` and `Attestation`.
 *
 * Finally, `Close` the loan, providing `{ give: Debt: debtAmount }}`
 *
 * To start the contract, authorize minting assets by providing `feeMintAccess`
 * and provide access to the underlying staking infrastructure in `lienBridge`.
 *
 * @typedef {{
 *   feeMintAccess: FeeMintAccess,
 *   initialPoserInvitation: Invitation,
 *   lienBridge: ERef<StakingAuthority>,
 *   storageNode: StorageNode,
 *   marshaller: Marshaller,
 * }} StakeFactoryPrivateArgs
 *
 * The creator facet can make an `AttestationMaker` for each account, which
 * authorizes placing a lien some of the staked assets in that account.
 * @typedef {{
 *   provideAttestationMaker: (addr: string) => AttestationTool,
 *   makeCollectFeesInvitation: () => Promise<Invitation>,
 * }} StakeFactoryCreator
 *
 * @type {ContractStartFn<StakeFactoryPublic, ERef<GovernedCreatorFacet<StakeFactoryCreator>>,
 *                        StakeFactoryTerms, StakeFactoryPrivateArgs>}
 */
export const start = async (
  zcf,
  {
    feeMintAccess,
    initialPoserInvitation,
    lienBridge,
    storageNode,
    marshaller,
  },
) => {
  const {
    brands: { Stake: stakeBrand },
    timerService,
    chargingPeriod,
    recordingPeriod,
  } = zcf.getTerms();
  assert.typeof(chargingPeriod, 'bigint', 'chargingPeriod must be a bigint');
  assert.typeof(recordingPeriod, 'bigint', 'recordingPeriod must be a bigint');
  assert(storageNode && marshaller, 'missing storageNode or marshaller');

  /** @type {ZCFMint<'nat'>} */
  const debtMint = await zcf.registerFeeMint(KW.Debt, feeMintAccess);
  const { brand: debtBrand } = debtMint.getIssuerRecord();

  const att = await makeAttestationFacets(zcf, stakeBrand, lienBridge);
  const attestBrand = await E(att.publicFacet).getBrand();

  const { augmentPublicFacet, makeGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      initialPoserInvitation,
      {
        DebtLimit: ParamTypes.AMOUNT,
        InterestRate: ParamTypes.RATIO,
        LoanFee: ParamTypes.RATIO,
        MintingRatio: ParamTypes.RATIO,
      },
      storageNode,
      marshaller,
    );

  /** For holding newly minted tokens until transferred */
  const { zcfSeat: mintSeat } = zcf.makeEmptySeatKit();

  const { zcfSeat: rewardPoolSeat } = zcf.makeEmptySeatKit();

  /**
   * Let the manager add rewards to the rewardPoolSeat
   * without directly exposing the rewardPoolSeat to them.
   *
   * @type {MintAndTransfer}
   */
  const mintAndTransfer = (mintReceiver, toMint, fee, nonMintTransfers) => {
    const kept = AmountMath.subtract(toMint, fee);
    debtMint.mintGains(harden({ [KW.Debt]: toMint }), mintSeat);
    /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
    const transfers = [
      ...nonMintTransfers,
      [mintSeat, rewardPoolSeat, { [KW.Debt]: fee }],
      [mintSeat, mintReceiver, { [KW.Debt]: kept }],
    ];

    try {
      atomicRearrange(zcf, harden(transfers));
    } catch (e) {
      console.error('mintAndTransfer failed to rearrange', e);
      // If the rearrange fails, burn the newly minted tokens.
      // Assume this won't fail because it relies on the internal mint.
      // (Failure would imply much larger problems.)
      debtMint.burnLosses(harden({ [KW.Debt]: toMint }), mintSeat);
      throw e;
    }
    // TODO add aggregate debt tracking at the vaultFactory level #4482
    // totalDebt = AmountMath.add(totalDebt, toMint);
  };

  const burnDebt = (toBurn, seat) => {
    debtMint.burnLosses(harden({ [KW.Debt]: toBurn }), seat);
  };

  const mintPowers = Far('mintPowers', {
    burnDebt,
    getGovernedParams: () => params, // XXX until governance support is durable
    mintAndTransfer,
  });

  const startTimeStamp = await E(timerService).getCurrentTimestamp();
  const { manager } = makeStakeFactoryManager(
    zcf,
    debtMint,
    harden({ Attestation: attestBrand, debt: debtBrand, Stake: stakeBrand }),
    // @ts-expect-error xxx governance types
    mintPowers,
    { timerService, chargingPeriod, recordingPeriod, startTimeStamp },
  );

  /**
   * @param {ZCFSeat} seat
   */
  const offerHandler = seat => {
    const { helper, pot } = makeStakeFactoryKit(zcf, seat, manager);

    return harden({
      publicSubscribers: {
        vault: pot.getSubscriber(),
      },
      invitationMakers: Far('invitation makers', {
        AdjustBalances: () =>
          zcf.makeInvitation(
            seatx => helper.adjustBalancesHook(seatx),
            'AdjustBalances',
          ),
        CloseVault: () =>
          zcf.makeInvitation(seatx => helper.closeHook(seatx), 'CloseVault'),
      }),
      vault: pot,
    });
  };

  const publicFacet = augmentPublicFacet(
    harden({
      makeLoanInvitation: () =>
        zcf.makeInvitation(offerHandler, 'make stakeFactory'),
      makeReturnAttInvitation: att.publicFacet.makeReturnAttInvitation,
    }),
  );

  /** @type {ERef<StakeFactoryCreator>} */
  const creatorFacet = Far('stakeFactory creator', {
    provideAttestationMaker: att.creatorFacet.provideAttestationTool,
    makeCollectFeesInvitation: () => {
      return makeMakeCollectFeesInvitation(
        zcf,
        rewardPoolSeat,
        debtBrand,
        'Minted',
      ).makeCollectFeesInvitation();
    },
  });

  return { publicFacet, creatorFacet: makeGovernorFacet(creatorFacet) };
};
harden(start);
