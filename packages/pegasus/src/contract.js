import { prepareWhenableModule } from '@agoric/whenable';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makePegasus } from './pegasus.js';

import '@agoric/zoe/exported.js';

import '../exported.js';

/**
 * @type {ContractStartFn<Pegasus, never, {}, {
 *   board: ERef<BoardDepositFacet>,
 *   namesByAddress: ERef<import('@agoric/vats').NameHub>
 * }}
 */
export const start = (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);

  const whenZone = zone.subZone('when');
  const { when } = prepareWhenableModule(whenZone);

  const { board, namesByAddress } = privateArgs;

  // start requires that the object passed in must be durable. Given that we
  // haven't made pegasus durable yet, we'll wrap its non-durable methods within
  // an exo object to workaround this requirement.
  const publicFacet = zone.exo('PublicFacet', undefined, {
    ...makePegasus({ zcf, board, namesByAddress, when }),
  });

  return harden({
    publicFacet,
  });
};
harden(start);
