// @ts-check
import { handleParamGovernance } from '@agoric/governance';
import { E, Far } from '@endo/far';
import { makeAttestationFacets } from './attestation.js';
import { makeRunStakeParamManager } from './params.js';
import { makeRUNstakeKit } from './runStakeKit.js';
import { makeRunStakeManager } from './runStakeManager';

/**
 * @param { ZCF<RunStakeTerms> } zcf
 * @param {{
 *   feeMintAccess: FeeMintAccess,
 *   initialPoserInvitation: Invitation,
 *   lienBridge: ERef<StakingAuthority>,
 * }} privateArgs
 *
 * @typedef {{
 *   timerService: TimerService,
 *   chargingPeriod: bigint,
 *   recordingPeriod: bigint,
 *   lienAttestationName: string,
 *   electionManager: VoteOnParamChange,
 *   main: {
 *     MintingRatio: ParamRecord<'ratio'>,
 *     InterestRate: ParamRecord<'ratio'>,
 *     LoanFee: ParamRecord<'ratio'>,
 *     Electorate: ParamRecord<'invitation'>,
 *   },
 * }} RunStakeTerms
 */
const start = async (
  zcf,
  { feeMintAccess, initialPoserInvitation, lienBridge },
) => {
  const {
    main: initialValue,
    brands: { Stake: stakeBrand },
    timerService,
    chargingPeriod,
    recordingPeriod,
    lienAttestationName = 'BldLienAtt',
  } = zcf.getTerms();
  assert.typeof(chargingPeriod, 'bigint', 'chargingPeriod must be a bigint');
  assert.typeof(recordingPeriod, 'bigint', 'recordingPeriod must be a bigint');

  const att = await makeAttestationFacets(
    zcf,
    stakeBrand,
    lienAttestationName,
    lienBridge,
  );
  // TODO: remove publicFacet wart
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

  // assertElectorateMatches(paramManager, otherGovernedTerms);

  /**
   * We provide an easy way for the policy to add rewards to
   * the rewardPoolSeat, without directly exposing the rewardPoolSeat to them.
   *
   * @type {ReallocateWithFee}
   */
  const reallocateWithFee = (fee, fromSeat, otherSeat = undefined) => {
    rewardPoolSeat.incrementBy(
      fromSeat.decrementBy(
        harden({
          RUN: fee,
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
  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
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

  /** @type { OfferHandler } */
  const makeRUNstakeHook = seat => {
    return makeRUNstakeKit(zcf, seat, manager, runMint);
  };

  const publicFacet = wrapPublicFacet(
    Far('getRUN Public API', {
      makeLoanInvitation: () =>
        zcf.makeInvitation(makeRUNstakeHook, 'make RUNstake', undefined),
      makeReturnAttInvitation: att.publicFacet.makeReturnAttInvitation,
    }),
  );

  return { publicFacet, creatorFacet: wrapCreatorFacet(att.creatorFacet) };
};

harden(start);
export { start };
