import { prepareWhen } from '@agoric/whenable';
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
export const prepare = (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);

  const whenZone = zone.subZone('when');
  const when = prepareWhen(whenZone);

  const { board, namesByAddress } = privateArgs;
  return {
    publicFacet: makePegasus({ zcf, board, namesByAddress, when }),
  };
};
harden(prepare);
