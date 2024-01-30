// @ts-check
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareRouterProtocol } from '@agoric/network';
import { prepareWhenableModule } from '@agoric/whenable';
import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, _args, baggage) {
  const zone = makeDurableZone(baggage);
  const powers = prepareWhenableModule(zone.subZone('whenable'));
  const makeRouterProtocol = prepareRouterProtocol(
    zone.subZone('network'),
    powers,
  );

  const protocol = makeRouterProtocol();

  return Far('RouterProtocol', {
    /** @param {Parameters<typeof protocol.registerProtocolHandler>} args */
    registerProtocolHandler: (...args) =>
      protocol.registerProtocolHandler(...args),
    /** @param {Parameters<typeof protocol.unregisterProtocolHandler>} args */
    unregisterProtocolHandler: (...args) =>
      protocol.unregisterProtocolHandler(...args),
    /** @param {Parameters<typeof protocol.bind>} args */
    bind: (...args) => protocol.bind(...args),
  });
}
