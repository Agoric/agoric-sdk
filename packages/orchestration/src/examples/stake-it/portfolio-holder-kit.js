import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { VowShape } from '@agoric/vow';
import { Fail } from '@endo/errors';
import {
  TopicsRecordShape,
  PublicTopicShape,
} from '@agoric/zoe/src/contractSupport/topics.js';

const { fromEntries } = Object;

/**
 * @import {MapStore} from '@agoric/store';
 * @import {VowTools} from '@agoric/vow';
 * @import {TopicsRecord} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {PublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationAccount} from '../../orchestration-api.js'
 */

/**
 * @typedef {{
 *   accounts: MapStore<string, OrchestrationAccount<any>>;
 *   publicTopics: MapStore<string, PublicTopic<unknown>>;
 * }} PortfolioHolderState
 */

const ChainNameM = M.string();

/**
 * A kit that holds several OrchestrationAccountKits and returns a invitation
 * makers.
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const preparePortfolioHolderKit = (zone, { watch }) => {
  return zone.exoClassKit(
    'PortfolioHolderKit',
    {
      invitationMakers: M.interface('InvitationMakers', {
        Action: M.call(ChainNameM, M.string(), M.arrayOf(M.any())).returns(
          VowShape,
        ),
      }),
      holder: M.interface('Holder', {
        asContinuingOffer: M.call().returns({
          publicSubscribers: TopicsRecordShape,
          invitationMakers: M.any(),
        }),
        getPublicTopics: M.call().returns(TopicsRecordShape),
        getAccount: M.call(ChainNameM).returns(M.remotable()),
        addAccount: M.call(
          ChainNameM,
          M.remotable(),
          PublicTopicShape,
        ).returns(),
      }),
      asContinuingOfferWatcher: M.interface('AsContinuingOfferWatcher', {
        onFulfilled: M.call(
          M.splitRecord({
            invitationMakers: M.any(),
            publicSubscribers: M.any(),
          }),
        )
          .optional({
            action: M.string(),
            invitationArgs: M.arrayOf(M.any()),
          })
          .returns(M.promise()),
      }),
    },
    /**
     * @param {Map<string, OrchestrationAccount<any>>} accountMap
     * @param {Map<string, PublicTopic<unknown>>} publicTopicMap
     */
    (accountMap, publicTopicMap) => {
      const accounts = harden(zone.mapStore('accounts'));
      const publicTopics = harden(zone.mapStore('publicTopics'));
      accounts.addAll(accountMap);
      publicTopics.addAll(publicTopicMap);
      return /** @type {PortfolioHolderState} */ (
        harden({
          accounts,
          publicTopics,
        })
      );
    },
    {
      invitationMakers: {
        /**
         * @param {string} chainName key where the account is stored
         * @param {string} action invitation maker name, e.g. 'Delegate'
         * @param {unknown[]} invitationArgs
         */
        Action(chainName, action, invitationArgs) {
          const { accounts } = this.state;
          accounts.has(chainName) || Fail`no account found for ${chainName}`;
          const account = accounts.get(chainName);
          return watch(
            // @ts-expect-error asContinuingOffer does not exist on OrchestrationAccountI
            E(account).asContinuingOffer(),
            this.facets.asContinuingOfferWatcher,
            { action, invitationArgs },
          );
        },
      },
      holder: {
        asContinuingOffer() {
          const { invitationMakers } = this.facets;
          const { publicTopics } = this.state;
          return harden({
            publicSubscribers: fromEntries(publicTopics.entries()),
            invitationMakers,
          });
        },
        /** @returns {TopicsRecord} */
        getPublicTopics() {
          const { publicTopics } = this.state;
          return fromEntries(publicTopics.entries());
        },
        /**
         * @param {string} chainName key where the account is stored
         * @param {OrchestrationAccount<any>} account
         * @param {PublicTopic<unknown>} publicTopic
         */
        addAccount(chainName, account, publicTopic) {
          if (this.state.accounts.has(chainName)) {
            throw Fail`account already exists for ${chainName}`;
          }
          zone.isStorable(account) ||
            Fail`account for ${chainName} must be storable`;
          zone.isStorable(publicTopic) ||
            Fail`publicTopic for ${chainName} must be storable`;

          this.state.publicTopics.init(chainName, publicTopic);
          this.state.accounts.init(chainName, account);
        },
        /**
         * @param {string} chainName key where the account is stored
         */
        getAccount(chainName) {
          return this.state.accounts.get(chainName);
        },
      },
      asContinuingOfferWatcher: {
        onFulfilled({ invitationMakers }, { action, invitationArgs }) {
          return E(invitationMakers)[action](...invitationArgs);
        },
      },
    },
  );
};

/** @typedef {ReturnType<typeof preparePortfolioHolderKit>} MakePortfolioHolderKit */
/** @typedef {ReturnType<MakePortfolioHolderKit>} PortfolioHolderKit */

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof preparePortfolioHolderKit>>
 * ) => PortfolioHolderKit['holder']}
 */
export const preparePortfolioHolder = (zone, vowTools) => {
  const makeKit = preparePortfolioHolderKit(zone, vowTools);
  return (...args) => makeKit(...args).holder;
};
/** @typedef {ReturnType<typeof preparePortfolioHolder>} MakePortfolioHolder */
/** @typedef {PortfolioHolderKit['holder']} PortfolioHolder */
