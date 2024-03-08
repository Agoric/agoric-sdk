// @ts-check
import { makeDurableZone } from '@agoric/zone/durable.js';
import {
  prepareEchoConnectionKit,
  prepareLoopbackProtocolHandler,
  prepareRouterProtocol,
} from '@agoric/network';
import { prepareVowTools } from '@agoric/vat-data/vow.js';
import { Far } from '@endo/far';

export function buildRootObject(_vatPowers, _args, baggage) {
  const zone = makeDurableZone(baggage);
  const powers = prepareVowTools(zone.subZone('vow'));

  const makeRouterProtocol = prepareRouterProtocol(
    zone.subZone('network'),
    powers,
  );
  const protocol = zone.makeOnce('RouterProtocol', _key =>
    makeRouterProtocol(),
  );

  const makeLoopbackProtocolHandler = prepareLoopbackProtocolHandler(
    zone,
    powers,
  );
  const makeEchoConnectionKit = prepareEchoConnectionKit(zone);

  return makeExo(
    'RouterProtocol',
    M.interface('RouterProtocol', {}, { defaultGuards: 'passable' }),
    {
      makeLoopbackProtocolHandler,
      makeEchoConnectionKit,
      /** @param {Parameters<typeof protocol.registerProtocolHandler>} args */
      registerProtocolHandler: (...args) =>
        protocol.registerProtocolHandler(...args),
      /** @param {Parameters<typeof protocol.unregisterProtocolHandler>} args */
      unregisterProtocolHandler: (...args) =>
        protocol.unregisterProtocolHandler(...args),
      /** @param {Parameters<typeof protocol.bind>} args */
      bind: (...args) => protocol.bind(...args),
    },
  );
}
