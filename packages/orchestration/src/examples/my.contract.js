import { M } from '@endo/patterns';
import { OrchestrationPowersShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './my.flows.js';
import { E } from '@endo/far';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';

/**
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {VTransferIBCEvent} from '@agoric/vats'
 */
const interfaceTODO = undefined;

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools} from '../types.js';
 */

export const meta = M.splitRecord({
  privateArgsShape: {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    marshaller: M.remotable('marshaller'),
  },
});
harden(meta);

/**
 * cf. CCTP docs
 */
const domains = {
  ethereum: 0,
  solana: 5,
};

// Left pad the mint recipient address with 0's to 32 bytes
const frobEthThingy = rawMintRecipient => {
  const cleanedMintRecipient = rawMintRecipient.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedMintRecipient.length;
  const mintRecipient = '0'.repeat(zeroesNeeded) + cleanedMintRecipient;
  const buffer = Buffer.from(mintRecipient, 'hex');
  return new Uint8Array(buffer);
};

/**
 * @param {any} _zcf
 * @param {any} _privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 * @returns
 */
export const contract = async (_zcf, _privateArgs, zone, tools) => {
  const { orchestrateAll } = tools;
  const { makeHookAccount, sendToEth } = orchestrateAll(flows, {});

  const hookAccountV = zone.makeOnce('hookAccount', _key =>
    makeHookAccount(tap),
  );

  const nobleAccountV = zone.makeOnce('nobleAccount', _key =>
    makeNobleAccount(),
  );

  const { vowTools } = tools;
  const hookAccountP = vowTools.when(hookAccountV);

  const tap = zone.makeOnce('tapPosition', _key => {
    console.log('making tap');
    /** @satisfies {import('@agoric/vats/src/bridge-target.js').TargetApp} */
    const tap = zone.exo('tap', interfaceTODO, {
      /** @param {VTransferIBCEvent} event */
      async receiveUpcall(event) {
        console.log(event);

        const { packet } = event;
        // IOU: if (packet.source_channel !== sourceChannel)

        const tx = /** @type {FungibleTokenPacketData} */ (
          JSON.parse(atob(packet.data))
        );
        console.log('@@@@tx', tx);

        const { query } = decodeAddressHook(tx.receiver);
        const { dest } = query;
        assert.typeof(dest, 'string');

        const { amount, denom: burnToken } = tx;
        assert.equal(burnToken, 'uusdc');
        const { value: from } = await E(hookAccountP).getAddress();

        const msg = {
          typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
          value: {
            from,
            amount,
            destinationDomain: domains.ethereum,
            mintRecipient: frobEthThingy(dest),
            burnToken,
          },
        };

        // we have an issue about this, no?
        const sent = await E(hookAccountP).executeTx([msg]);
      },
    });
    return tap;
  });

  return {
    publicFacet: zone.exo('MyPub', undefined, {
      getHookAddress: () => E(hookAccountP).getAddress(),
    }),
    creatorFacet: zone.exo('MyCreator', undefined, {}),
  };
};

export const start = withOrchestration(contract);
harden(start);
