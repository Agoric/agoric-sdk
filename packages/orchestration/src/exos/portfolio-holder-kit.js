import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { Fail } from '@endo/errors';
import { PublicTopicShape } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';

const { fromEntries } = Object;

/**
 * @import {HostInterface, HostOf} from '@agoric/async-flow';
 * @import {MapStore} from '@agoric/store';
 * @import {VowTools} from '@agoric/vow';
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationAccount, OrchestrationAccountI} from '@agoric/orchestration';
 * @import {Pattern, Method, MethodGuard} from '@endo/patterns';
 */

/**
 * @typedef {{
 *   accounts: MapStore<string, HostInterface<OrchestrationAccount<any>>>;
 *   publicTopics: MapStore<string, ResolvedPublicTopic<unknown>>;
 * }} PortfolioHolderKitState
 */

const ChainNameShape = M.string();

const AccountEntriesShape = M.arrayOf([
  ChainNameShape,
  M.remotable('OrchestrationAccount'),
]);
const PublicTopicEntriesShape = M.arrayOf([ChainNameShape, PublicTopicShape]);

const PortfolioHolderKitStateShape = {
  accounts: M.remotable('accounts mapStore'),
  publicTopics: M.remotable('publicTopics mapStore'),
};

/**
 * @typedef {{
 *   extraInvitationMakerGuards?: Record<PropertyKey, MethodGuard>;
 *   extraInvitationMakerMethods?: Record<PropertyKey, Method>;
 *   extraStateShape?: Record<PropertyKey, Pattern>;
 * }} PortfolioHolderKitOpts
 */

/**
 * Kit that holds several OrchestrationAccountKits and returns a invitation
 * makers.
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @param {PortfolioHolderKitOpts} [opts] extend the default kit with extra
 *   invitationMakers
 */
export const preparePortfolioHolderKit = (
  zone,
  { asVow, when },
  {
    extraInvitationMakerGuards = {},
    extraInvitationMakerMethods = {},
    extraStateShape = {},
  } = {},
) => {
  return zone.exoClassKit(
    'PortfolioHolderKit',
    {
      invitationMakers: M.interface('InvitationMakers', {
        MakeInvitation: M.call(
          ChainNameShape,
          M.string(),
          M.arrayOf(M.any()),
        ).returns(M.promise()),
        // allow preparer to add extra invitation maker guards
        ...extraInvitationMakerGuards,
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
     * @param {Record<PropertyKey, unknown>} [extraState] custom extra state
     *   entries. Can be guarded via `opts.extraStateShape`
     */
    (accountEntries, publicTopicEntries, extraState) => {
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
      return /** @type {PortfolioHolderKitState} } */ (
        harden({
          accounts,
          publicTopics,
          ...extraState,
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
          // @ts-expect-error XXX invitationMakers
          return when(E(account).asContinuingOffer(), ({ invitationMakers }) =>
            E(invitationMakers)[action](...invitationArgs),
          );
        },
        // allow preparer to add extra methods and intentionally override
        // built-in methods
        ...extraInvitationMakerMethods,
      },
      holder: {
        // FIXME /** @type {HostOf<OrchestrationAccountI['asContinuingOffer']>} */
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
        // FIXME /** @type {HostOf<OrchestrationAccountI['getPublicTopics']>} */
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
    {
      stateShape: {
        ...PortfolioHolderKitStateShape,
        ...extraStateShape,
      },
    },
  );
};

/**
 * A portfolio holder stores two or more OrchestrationAccounts and combines
 * ContinuingOfferResult's from each into a single result.
 *
 * XXX generic type needed for extra invitationMakers?
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @param {PortfolioHolderKitOpts} [opts]
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof preparePortfolioHolderKit>>
 * ) => ReturnType<ReturnType<typeof preparePortfolioHolderKit>>['holder']}
 */
export const preparePortfolioHolder = (zone, vowTools, opts) => {
  const makeKit = preparePortfolioHolderKit(zone, vowTools, opts);
  return (...args) => makeKit(...args).holder;
};
/** @typedef {ReturnType<typeof preparePortfolioHolder>} MakePortfolioHolder */
/** @typedef {ReturnType<MakePortfolioHolder>} PortfolioHolder */
