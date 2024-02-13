// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { M } from '@endo/patterns';

import '@agoric/notifier/exported.js';

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareChainClientTools = zone => {
  const makeOcapAuthToken = zone.exoClass(
    'OcapAuthToken',
    M.interface('OcapAuthToken', {
      getAllegedInfo: M.call().returns(M.record()),
    }),
    info => ({ info }),
    {
      getAllegedInfo() {
        return this.state.info;
      },
    },
  );

  // Use the marshaller, with no support for embedded ocaps or promises.
  const { toCapData } = makeMarshal(undefined, undefined, {
    serializeBodyFormat: 'smallcaps',
  });

  /**
   * Create a string representation of a data object.
   * @param {unknown} obj
   * @returns {string}
   */
  const pickle = obj => toCapData(harden(obj)).body;

  /**
   * @param {import('./types.js').AccountInfo} info
   * @param {import('@endo/far').FarRef<import('./types.js').Chain>} chain
   * @returns {import('./types.js').TxAuthorizerKit})}
   */
  const makeOcapTxAuthorizerKit = zone.exoClassKit(
    'OcapTxAuthorizerKit',
    undefined,
    /**
     * @param {import('./types.js').AccountInfo} info
     * @param {import('@endo/far').FarRef<import('./types.js').Chain>} chain
     */
    (info, chain) => ({
      info,
      chain,
      authTokenToPickle: zone.detached().weakMapStore('OcapAuthTokens'),
    }),
    {
      authorizer: {
        async getInfo() {
          return this.state.info;
        },
        /**
         * @param {import('./types.js').Transaction} tx
         * @returns {Promise<unknown>}
         */
        async authorize(tx) {
          const { info, authTokenToPickle } = this.state;
          // Strip out the authorizations, since they aren't part of what needs
          // to be authorized.
          const { authorizations: _, ...txToPickle } = tx;
          const authToken = makeOcapAuthToken(info);
          // Save the pickled transaction, so we can verify it later.
          authTokenToPickle.init(authToken, pickle(txToPickle));
          return authToken;
        },
        /**
         * @param {import('./types.js').Transaction} tx
         * @returns {Promise<import('./types.js').EventTopic>}
         */
        async authorizeAndSubmit(tx) {
          const { chain } = this.state;
          const { authorizations = [], ...initialTx } = tx;

          // Augment the transaction with chain-specific options.
          const opts = await E(chain).populateTxOptions(initialTx);
          const populatedTx = { ...tx, opts };

          // Authorize the populated transaction.
          const authToken = await this.facets.authorizer.authorize(populatedTx);

          // Subscribe to events associated with our new authorization token.
          // We do this before submitting the transaction, so we don't miss the
          // event if the transaction is processed quickly.
          const topic = await E(chain).subscribeEvents({
            typeUrl: '/agoric.Event',
            obj: {
              blockHeight: M.bigint(),
              blockTime: M.number(),
              event: M.splitRecord({ authToken }, undefined, M.any()),
            },
          });

          // Now submit the authorized transaction.
          const authorizedTx = {
            ...populatedTx,
            authorizations: [authToken, ...authorizations],
          };
          await E(chain).submitFinishedTx(authorizedTx);

          // Allow our caller to monitor the event subscription for status.
          return topic;
        },
      },
      verifier: {
        async getInfo() {
          return this.state.info;
        },
        /**
         * @param {import('./types.js').Transaction} tx
         * @returns {Promise<boolean>}
         */
        async verify(tx) {
          const { authTokenToPickle } = this.state;
          const { authorizations = [], ...txToPickle } = tx;
          if (!Array.isArray(authorizations) || !authorizations.length) {
            // No authorizations to verify.
            return false;
          }
          const p1 = pickle(txToPickle);
          return authorizations.some(authToken => {
            if (!authTokenToPickle.has(authToken)) {
              // Auth token identity wasn't produced by us.
              return false;
            }
            // The auth token matches, so compare the pickles.
            const p2 = authTokenToPickle.get(authToken);
            // Compare the pickles.
            return p1 === p2;
          });
        },
      },
    },
  );

  const makeChainClient = zone.exoClass(
    'ChainClient',
    undefined,
    () => ({}),
    {},
  );
  return { makeChainClient, makeOcapTxAuthorizerKit };
};
