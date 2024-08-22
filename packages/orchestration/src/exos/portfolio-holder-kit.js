import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { Fail } from '@endo/errors';
import { PublicTopicShape } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';

const { fromEntries } = Object;

/**
 * @import {HostInterface, HostFn} from '@agoric/async-flow';
 * @import {MapStore} from '@agoric/store';
 * @import {VowTools} from '@agoric/vow';
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationAccount, OrchestrationAccountI} from '@agoric/orchestration';
 */

/**
 * @typedef {{
 *   accounts: MapStore<string, HostInterface<OrchestrationAccount<any>>>;
 *   publicTopics: MapStore<string, ResolvedPublicTopic<unknown>>;
 * }} PortfolioHolderState
 */

const ChainNameShape = M.string();

const AccountEntriesShape = M.arrayOf([
  M.string(),
  M.remotable('OrchestrationAccount'),
]);
const PublicTopicEntriesShape = M.arrayOf([M.string(), PublicTopicShape]);

/**
 * Kit that holds several OrchestrationAccountKits and returns a invitation
 * makers.
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const preparePortfolioHolderKit = (zone, { asVow, when }) => {
  return zone.exoClassKit(
    'PortfolioHolderKit',
    {
      invitationMakers: M.interface('InvitationMakers', {
        MakeInvitation: M.call(
          ChainNameShape,
          M.string(),
          M.arrayOf(M.any()),
        ).returns(M.promise()),
      }),
      holder: M.interface('Holder', {
        asContinuingOffer: M.call().returns(VowShape),
        getPublicTopics: M.call().returns(VowShape),
        getAccount: M.call(ChainNameShape).returns(VowShape),
        addAccount: M.call(
          ChainNameShape,
          M.remotable(),
          PublicTopicShape,
        ).returns(VowShape),
      }),
    },
    /**
     * @param {Iterable<[string, OrchestrationAccount<any>]>} accountEntries
     * @param {Iterable<[string, ResolvedPublicTopic<unknown>]>} publicTopicEntries
     */
    (accountEntries, publicTopicEntries) => {
      mustMatch(accountEntries, AccountEntriesShape, 'must provide accounts');
      mustMatch(
        publicTopicEntries,
        PublicTopicEntriesShape,
        'must provide public topics',
      );
      const accounts = harden(
        makeScalarBigMapStore('accounts', { durable: true }),
      );
      const publicTopics = harden(
        makeScalarBigMapStore('publicTopics', { durable: true }),
      );
      accounts.addAll(accountEntries);
      publicTopics.addAll(publicTopicEntries);
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
         * @template {unknown[]} IA
         * @param {string} chainName key where the account is stored
         * @param {string} action invitation maker name, e.g. 'Delegate'
         * @param {IA} invitationArgs
         * @returns {Promise<Invitation<unknown, IA>>}
         */
        MakeInvitation(chainName, action, invitationArgs) {
          const { accounts } = this.state;
          accounts.has(chainName) || Fail`no account found for ${chainName}`;
          const account = accounts.get(chainName);
          return when(E(account).asContinuingOffer(), ({ invitationMakers }) =>
            E(invitationMakers)[action](...invitationArgs),
          );
        },
      },
      holder: {
        // FIXME /** @type {HostFn<OrchestrationAccountI['asContinuingOffer']>} */
        asContinuingOffer() {
          return asVow(() => {
            const { invitationMakers } = this.facets;
            const { publicTopics } = this.state;
            return harden({
              publicSubscribers: fromEntries(publicTopics.entries()),
              invitationMakers,
            });
          });
        },
        // FIXME /** @type {HostFn<OrchestrationAccountI['getPublicTopics']>} */
        getPublicTopics() {
          return asVow(() => {
            const { publicTopics } = this.state;
            return harden(fromEntries(publicTopics.entries()));
          });
        },
        /**
         * @param {string} chainName key where the account is stored
         * @param {HostInterface<OrchestrationAccount<any>>} account
         * @param {ResolvedPublicTopic<unknown>} publicTopic
         */
        addAccount(chainName, account, publicTopic) {
          return asVow(() => {
            if (this.state.accounts.has(chainName)) {
              throw Fail`account already exists for ${chainName}`;
            }
            zone.isStorable(account) ||
              Fail`account for ${chainName} must be storable`;
            zone.isStorable(publicTopic) ||
              Fail`publicTopic for ${chainName} must be storable`;

            this.state.publicTopics.init(chainName, publicTopic);
            this.state.accounts.init(chainName, account);
          });
        },
        /**
         * @param {string} chainName key where the account is stored
         */
        getAccount(chainName) {
          return asVow(() => this.state.accounts.get(chainName));
        },
      },
    },
  );
};

/**
 * A portfolio holder stores two or more OrchestrationAccounts and combines
 * ContinuingOfferResult's from each into a single result.
 *
 * XXX consider an interface for extending the exo maker with additional
 * invitation makers.
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof preparePortfolioHolderKit>>
 * ) => ReturnType<ReturnType<typeof preparePortfolioHolderKit>>['holder']}
 */
export const preparePortfolioHolder = (zone, vowTools) => {
  const makeKit = preparePortfolioHolderKit(zone, vowTools);
  return (...args) => makeKit(...args).holder;
};
/** @typedef {ReturnType<typeof preparePortfolioHolder>} MakePortfolioHolder */
/** @typedef {ReturnType<MakePortfolioHolder>} PortfolioHolder */
