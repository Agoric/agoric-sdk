/* eslint-disable import/no-extraneous-dependencies -- FIXME */
// @ts-check
import { Far } from '@endo/far';
import { SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { bech32Config } from '@agoric/wallet-ui/src/util/chainInfo.js';
import {
  SwingsetMsgs,
  SwingsetRegistry,
  zeroFee,
} from '@agoric/wallet-ui/src/util/keyManagement.js';
import { toBase64 } from '@cosmjs/encoding';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { DEFAULT_RETRY_CALLBACK, DEFAULT_JITTER } from './defaults.js';
import { makePollingChangeFollower } from './change-follower.js';
import { makeRoundRobinEndpointMapper } from './round-robin-mapper.js';

/**
 * @param {import('./types.js').Leader} leader
 * @param clientOptions
 * @returns {Promise<import('./types.js').WalletActionClient>}
 */
const makeSeedClient = async (leader, clientOptions) => {
  console.log('makeSeedClient', clientOptions);
  const fee = zeroFee();
  const wallet = await DirectSecp256k1Wallet.fromKey(
    clientOptions.seed,
    // XXX move into this package
    bech32Config.bech32PrefixAccAddr,
  );
  let rpcEndpoint;
  console.log('about to mapEndpoints');
  await leader.mapEndpoints('makeSeedClient', async (_where, endpoint) => {
    console.log('got an endpoint', endpoint);
    rpcEndpoint = endpoint;
  });
  assert(rpcEndpoint);
  const signingClient = await SigningStargateClient.connectWithSigner(
    rpcEndpoint,
    wallet,
    {
      registry: SwingsetRegistry,
    },
  );
  const [account] = await wallet.getAccounts();
  const { address } = account;

  return {
    getSigningClient: () => signingClient,
    /**
     * @type {(action: import('./types.js').ApplyMethodPayload) => void}
     */
    sendAction(action) {
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
      signingClient.signAndBroadcast(address, msgs, fee);
    },
  };
};

/**
 * @param {string[]} endpoints
 * @param {import('./types').LeaderOptions} [leaderOptions]
 * @returns {import('./types').Leader}
 */
export const makeCosmJSLeader = (endpoints, leaderOptions) => {
  const { retryCallback = DEFAULT_RETRY_CALLBACK, jitter = DEFAULT_JITTER } =
    leaderOptions || {};

  const actualOptions = { ...leaderOptions, retryCallback, jitter };

  /** @type {import('./types.js').Leader} */
  const leader = Far('cosmjs leader', {
    getOptions: () => actualOptions,
    makeClient: clientOptions => {
      const { mnemonic, keplr, seed } = clientOptions;
      assert(!mnemonic && !keplr, 'NOT YET');
      assert(seed, 'seed required');
      return makeSeedClient(leader, clientOptions);
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
