import harden from '@agoric/harden';
import { makeExchange } from './lib-exchange';

function build(E, log) {
  let userFacet;

  function startup(host, zoe, registrar, uploads) {
    const exchange = makeExchange(E, log, host, zoe, registrar, uploads);
    userFacet = exchange.userFacet;
  }

  function getExchange() {
    return harden(userFacet);
  }

  function getCommandHandler() {
    return {
      async processInbound(obj) {
        const { type, data } = obj;
        switch (type) {
          case 'autoswapGetPrice': {
            const { instanceId, extent0, assayId0, assayId1 } = data;
            const extent = await userFacet.getPrice(
              instanceId,
              extent0,
              assayId0,
              assayId1,
            );
            return { type: 'autoswapPrice', data: extent };
          }

          case 'autoswapGetOfferRules': {
            const { instanceId, extent0, assayId0, assayId1 } = data;
            const offerRules = await userFacet.getOfferRules(
              instanceId,
              extent0,
              assayId0,
              assayId1,
            );
            return { type: 'autoswapOfferRules', data: offerRules };
          }
          default:
            return false;
        }
      },
    };
  }

  return harden({ startup, getExchange, getCommandHandler });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
