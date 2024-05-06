import { Far } from '@endo/far';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareVowTools } from '@agoric/vow/vat.js';
import { prepareCallbacks, prepareIBCProtocol } from './ibc.js';

export function buildRootObject(_vatPowers, _args, baggage) {
  const zone = makeDurableZone(baggage);
  const powers = prepareVowTools(zone.subZone('vow'));
  const makeIBCProtocolHandler = prepareIBCProtocol(
    zone.subZone('IBC'),
    powers,
  );

  const makeCallbacks = prepareCallbacks(zone);

  function createHandlers(callbacks) {
    const ibcHandler = makeIBCProtocolHandler(callbacks);
    return harden(ibcHandler);
  }

  return Far('root', {
    createHandlers,
    makeCallbacks,
  });
}
