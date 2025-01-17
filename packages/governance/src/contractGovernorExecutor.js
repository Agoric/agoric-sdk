import { E } from '@endo/eventual-send';
import { makeTracer } from '@agoric/internal';
import { prepareExoClassKit } from '@agoric/vat-data';

const trace = makeTracer('CGExec', false);

/** @type {ContractMeta} */
export const meta = {
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * Start an instance of a governor, governing a "governed" contract specified in terms.
 *
 * @param {ZCF<{}>} zcf
 * @param {{}} _privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, _privateArgs, baggage) => {
  trace('start');
  const makeContractGovernorKit = prepareExoClassKit(
    baggage,
    'ContractGovernorKit',
    undefined,
    () => {
      /** @type {Awaited<ReturnType<ZoeService['startInstance']>>} */
      // @ts-expect-error
      const kit = null;
      return kit;
    },
    {
      creator: {
        terminateInstance() {
          const { adminFacet: contractInstanceAdminFacet } = this.state;
          const terminationData = harden(
            Error(`termination of contract by executor governor`),
          );
          // we can't await remote calls in our 1st crank
          // so fire-and-forget
          void E(contractInstanceAdminFacet)
            .terminateContract(terminationData)
            .catch(err => {
              console.log('FYI:', err);
            });
          console.log('initiated termination of instance'); // TODO: what instance?
        },
      },
      helper: {},
      public: {},
    },
  );
  console.log('defined ContractGovernorKit kind', makeContractGovernorKit);
  /** @type {ReturnType<makeContractGovernorKit>} */
  const governorKit = baggage.get('contractGovernorKit');
  await governorKit.creator.terminateInstance();

  return { creatorFacet: governorKit.creator, publicFacet: governorKit.public };
};
harden(start);
