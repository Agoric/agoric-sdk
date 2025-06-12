import {
  CONTRACT_ELECTORATE,
  ParamTypes,
  handleParamGovernance,
} from '@agoric/governance';
import { prepareExoClassKit, provide } from '@agoric/vat-data';

/**
 * @import {GovernanceTerms} from '@agoric/governance/src/types.js';
 * @import {Baggage} from '@agoric/vat-data';
 */

const MALLEABLE_NUMBER = 'MalleableNumber';

const makeTerms = (number, invitationAmount) => {
  return harden({
    governedParams: {
      [MALLEABLE_NUMBER]: { type: ParamTypes.NAT, value: number },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
    },
  });
};

/**
 *
 * @param {ZCF<
 * GovernanceTerms<{
 *   MalleableNumber: 'nat',
 * }>>} zcf
 * @param {{initialPoserInvitation: Invitation}} privateArgs
 * @param {Baggage} baggage
 */
const start = async (zcf, privateArgs, baggage) => {
  const { makeDurableGovernorFacet, params } = await handleParamGovernance(
    zcf,
    privateArgs.initialPoserInvitation,
    {
      [MALLEABLE_NUMBER]: ParamTypes.NAT,
    },
  );

  const makeGoverned = prepareExoClassKit(
    baggage,
    'governed Public',
    undefined,
    () =>
      harden({
        governanceAPICalled: 0,
      }),
    {
      public: {
        getNum() {
          return params.getMalleableNumber();
        },
        getApiCalled() {
          const { governanceAPICalled } = this.state;
          return governanceAPICalled;
        },
      },
      creator: {},
      governed: {
        add1() {
          const { state } = this;
          state.governanceAPICalled += 1;
        },
      },
    },
  );
  const facets = provide(baggage, 'theContract', () => makeGoverned());

  const { governorFacet } = makeDurableGovernorFacet(baggage, facets.creator, {
    add1: () => facets.governed.add1(),
  });

  return { publicFacet: facets.public, creatorFacet: governorFacet };
};

harden(start);
harden(MALLEABLE_NUMBER);
harden(makeTerms);

export { start, MALLEABLE_NUMBER, makeTerms };
