// @ts-check
import { makeDurableZone } from '@agoric/zone/durable.js';
import {
  prepareEchoConnectionKit,
  prepareLoopbackProtocolHandler,
  prepareNetworkPowers,
  preparePortAllocator,
  prepareRouterProtocol,
} from '@agoric/network';
import { prepareVowTools } from '@agoric/vow/vat.js';
import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, _args, baggage) {
  const zone = makeDurableZone(baggage);
  const vowTools = prepareVowTools(zone.subZone('vow'));
  const powers = prepareNetworkPowers(zone, vowTools);

  const makeRouterProtocol = prepareRouterProtocol(
    zone.subZone('network'),
    powers,
  );
  const protocol = zone.makeOnce('RouterProtocol', _key =>
    makeRouterProtocol(),
  );

  const makePortAllocator = preparePortAllocator(zone, powers);
  const portAllocator = zone.makeOnce('PortAllocator', _key =>
    makePortAllocator({ protocol }),
  );

  const makeLoopbackProtocolHandler = prepareLoopbackProtocolHandler(
    zone,
    powers,
  );
  const makeEchoConnectionKit = prepareEchoConnectionKit(zone);

  return Far('RouterProtocol', {
    makeLoopbackProtocolHandler,
    makeEchoConnectionKit,
    /** @param {Parameters<typeof protocol.registerProtocolHandler>} args */
    registerProtocolHandler: (...args) =>
      protocol.registerProtocolHandler(...args),
    /** @param {Parameters<typeof protocol.unregisterProtocolHandler>} args */
    unregisterProtocolHandler: (...args) =>
      protocol.unregisterProtocolHandler(...args),
    getPortAllocator() {
      return portAllocator;
    },
  });
}
