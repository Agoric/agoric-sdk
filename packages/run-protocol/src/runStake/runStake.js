// @ts-check
import { handleParamGovernance } from '@agoric/governance';
import { E, Far } from '@endo/far';
import { makeAttestationFacets } from './attestation.js';
import { makeRunStakeParamManager } from './params.js';
import { makeRunStakeKit, KW } from './runStakeKit.js';
import { makeRunStakeManager } from './runStakeManager.js';

export { KW };

/**
 * Provide loans on the basis of staked assets that earn rewards.
 *
 * In addition to brands and issuers for `Staked`, `RUN`, and attestation,
 * terms of the contract include a periodic interest rate plus
 * a fee proportional to the amount borrowed, as well as a ratio
 * of funds to mint and loan per unit of staked asset.
 * These terms are subject to change by the `Electorate`
 * and `electionManager` terms.
 *
 * @typedef {{
 *   electionManager: VoteOnParamChange,
 *   main: {
 *     MintingRatio: ParamRecord<'ratio'>,
 *     InterestRate: ParamRecord<'ratio'>,
 *     LoanFee: ParamRecord<'ratio'>,
 *     Electorate: ParamRecord<'invitation'>,
 *   },
 * }} RunStakeGovernanceTerms
 *
 * As in vaultFactory, `timerService` provides the periodic signal to
 * charge interest according to `chargingPeriod` and `recordingPeriod`.
 *
 * @typedef { RunStakeGovernanceTerms & {
 *   timerService: TimerService,
 *   chargingPeriod: bigint,
 *   recordingPeriod: bigint,
 *   lienAttestationName?: string,
 * }} RunStakeTerms
 *
 * The public facet provides access to invitations to get a loan
 * or to return an attestation in order to release a lien on staked assets.
 *
 * @typedef {{
 *   makeLoanInvitation: () => Promise<Invitation>,
 *   makeReturnAttInvitation: () => Promise<Invitation>,
 * }} RunStakePublic
 *
 * To take out a loan, get an `AttMaker` for your address from
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
 * }} RunStakePrivateArgs
 *
 * The creator facet can make an `AttMaker` for each account, which
 * authorizes placing a lien some of the staked assets in that account.
 * @typedef {{
 *   provideAttestationMaker: (addr: string) => AttMaker,
 *   getLiened: (address: string, brand: Brand<'nat'>) => Amount<'nat'>,
 * }} RunStakeCreator
 *
 * @type {ContractStartFn<RunStakePublic, RunStakeCreator,
 *                        RunStakeTerms, RunStakePrivateArgs>}
 */
export const start = async (
  zcf,
  { feeMintAccess, initialPoserInvitation, lienBridge },
) => {
  const {
    main: initialValue,
    brands: { Stake: stakeBrand },
    timerService,
    chargingPeriod,
    recordingPeriod,
  } = zcf.getTerms();
  assert.typeof(chargingPeriod, 'bigint', 'chargingPeriod must be a bigint');
  assert.typeof(recordingPeriod, 'bigint', 'recordingPeriod must be a bigint');

  const att = await makeAttestationFacets(zcf, stakeBrand, lienBridge);
  const attestBrand = await E(att.publicFacet).getBrand();

  const paramManager = await makeRunStakeParamManager(
    zcf.getZoeService(),
    {
      mintingRatio: initialValue.MintingRatio.value,
      interestRate: initialValue.InterestRate.value,
      loanFee: initialValue.LoanFee.value,
    },
    initialPoserInvitation,
  );

  const { wrapPublicFacet, wrapCreatorFacet } = handleParamGovernance(
    zcf,
    paramManager,
  );

  const { zcfSeat: rewardPoolSeat } = zcf.makeEmptySeatKit();

  // TODO: assertElectorateMatches(paramManager, otherGovernedTerms);

  /**
   * Let the manager add rewards to the rewardPoolSeat
   * without directly exposing the rewardPoolSeat to them.
   *
   * @type {ReallocateWithFee}
   */
  const reallocateWithFee = (fee, fromSeat, otherSeat = undefined) => {
    rewardPoolSeat.incrementBy(
      fromSeat.decrementBy(
        harden({
          [KW.Debt]: fee,
        }),
      ),
    );
    if (otherSeat !== undefined) {
      zcf.reallocate(rewardPoolSeat, fromSeat, otherSeat);
    } else {
      zcf.reallocate(rewardPoolSeat, fromSeat);
    }
  };

  /** @type {ZCFMint<'nat'>} */
  const runMint = await zcf.registerFeeMint(KW.Debt, feeMintAccess);
  const { brand: runBrand } = runMint.getIssuerRecord();
  const startTimeStamp = await E(timerService).getCurrentTimestamp();
  const manager = makeRunStakeManager(
    zcf,
    runMint,
    { Attestation: attestBrand, debt: runBrand, Stake: stakeBrand },
    paramManager.readonly(),
    reallocateWithFee,
    { timerService, chargingPeriod, recordingPeriod, startTimeStamp },
  );

  const publicFacet = wrapPublicFacet(
    Far('runStake public interface', {
      makeLoanInvitation: () =>
        zcf.makeInvitation(
          seat => makeRunStakeKit(zcf, seat, manager, runMint),
          'make RUNstake',
          undefined,
        ),
      makeReturnAttInvitation: att.publicFacet.makeReturnAttInvitation,
    }),
  );

  const creatorFacet = wrapCreatorFacet(att.creatorFacet);

  // @ts-expect-error wrapCreatorFacet loses type info
  return { publicFacet, creatorFacet };
};
harden(start);
