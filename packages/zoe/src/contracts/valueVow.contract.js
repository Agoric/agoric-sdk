import { prepareVowTools } from '@agoric/vow';
import { makeDurableZone } from '@agoric/zone/durable.js';

/**
 * @import { Baggage } from '@agoric/vat-data';
 */

/** @type {ContractMeta<typeof start>} */
export const meta = {
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * This is a simple contract to demonstrate durable vows.
 *
 * It provides an invitation to get a vow for a value and another invitation to set the value.
 *
 * @param {ZCF<{}>} zcf
 * @param {undefined} _privateArgs
 * @param {Baggage} baggage
 */
export const start = (zcf, _privateArgs, baggage) => {
  zcf.setTestJig(() => ({
    baggage,
  }));

  const zone = makeDurableZone(baggage);

  const vowTools = prepareVowTools(zone);

  const { vow, resolver } = zone.makeOnce('vowResolver', () =>
    vowTools.makeVowKit(),
  );

  const publicFacet = zone.exo('publicFacet', undefined, {
    getValue() {
      return vow;
    },
    setValue(value) {
      resolver.resolve(value);
    },
    makeGetterInvitation() {
      return zcf.makeInvitation(seat => {
        seat.exit();
        return vow;
      }, 'get value');
    },
    makeSetterInvitation() {
      return zcf.makeInvitation(
        /** @type {HandleOffer<void, { value: unknown }>}} */
        (seat, offerArgs) => {
          seat.exit();
          resolver.resolve(offerArgs.value);
        },
        'set value',
      );
    },
  });

  return harden({ publicFacet });
};
harden(start);
