/* eslint-disable import/no-extraneous-dependencies -- FIXME */
// @ts-check
import { Far } from '@endo/far';
import { SigningStargateClient } from '@cosmjs/stargate';
import {
  SwingsetMsgs,
  SwingsetRegistry,
  zeroFee,
} from '@agoric/wallet-ui/src/util/keyManagement.js';
import { toBase64 } from '@cosmjs/encoding';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx.js';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { DEFAULT_RETRY_CALLBACK, DEFAULT_JITTER } from './defaults.js';
import { makePollingChangeFollower } from './change-follower.js';
import { makeRoundRobinEndpointMapper } from './round-robin-mapper.js';

/**
 * @param {Leader} leader
 * @param {import('@cosmjs/proto-signing').OfflineSigner} signer
 * @returns {Promise<SigningStargateClient>}
 */
const connectWithLeader = async (leader, signer) => {
  let rpcEndpoint;
  console.log('about to mapEndpoints');
  await leader.mapEndpoints('makeSeedClient', async (_where, endpoint) => {
    console.log('got an endpoint', endpoint);
    rpcEndpoint = endpoint;
  });
  assert(rpcEndpoint);
  return SigningStargateClient.connectWithSigner(rpcEndpoint, signer, {
    registry: SwingsetRegistry,
  });
};

/**
 * @param {string[]} endpoints
 * @param {import('./types').LeaderOptions} [leaderOptions]
 */
export const makeCosmJSLeader = (endpoints, leaderOptions) => {
  const { retryCallback = DEFAULT_RETRY_CALLBACK, jitter = DEFAULT_JITTER } =
    leaderOptions || {};

  const actualOptions = { ...leaderOptions, retryCallback, jitter };

  const leader = Far('cosmjs leader', {
    getOptions: () => actualOptions,
    /** @param {import('@cosmjs/proto-signing').OfflineSigner} signer */
    makeSigningClient: signer => {
      return connectWithLeader(leader, signer);
    },
    /**
     * @param {SigningStargateClient} signingClient
     * @param {import('@cosmjs/proto-signing').AccountData} account
     */
    makeCastingClient: (signingClient, account) => {
      const { address } = account;
      return {
        /**
         * @type {(action: import('./types.js').ApplyMethodPayload) => Promise<import('@cosmjs/stargate').DeliverTxResponse>}
         */
        async sendAction(action) {
          console.log('sendAction', action);
          const act1 = {
            typeUrl: SwingsetMsgs.MsgWalletSpendAction.typeUrl,
            /** @type {import('@agoric/wallet-ui/src/util/keyManagement.js').WalletAction} */
            value: {
              owner: toBase64(toAccAddress(address)),
              // ??? document how this works
              action: JSON.stringify(action),
            },
          };

          const msgs = [act1];
          console.log('sign spend action', { address, msgs });

          const txRaw = await signingClient.sign(
            address,
            msgs,
            zeroFee(),
            'casting leader sendAction',
          );

          const txBytes = TxRaw.encode(txRaw).finish();
          return this.broadcastTx(
            txBytes,
            this.broadcastTimeoutMs,
            this.broadcastPollIntervalMs,
          );
        },
      };
    },
    jitter: where => jitter && jitter(where),
    retry: async (where, err, attempt) => {
      if (retryCallback) {
        return retryCallback(where, err, attempt);
      }
      throw err;
    },
    makeWatcher: async castingSpec => {
      const spec = await castingSpec;
      // @ts-expect-error not sure
      const follower = makePollingChangeFollower(leader, spec);
      return follower;
    },
    mapEndpoints: (where, callback) => {
      // eslint-disable-next-line no-use-before-define
      return mapper(where, callback);
    },
  });

  // used within 'leader'
  const mapper = makeRoundRobinEndpointMapper(leader, endpoints);
  return leader;
};
/** @typedef {ReturnType<typeof makeCosmJSLeader>} Leader */
