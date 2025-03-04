import type {
  AnyAmount,
  AssetKind,
  DisplayInfo,
  Issuer,
  NatValue,
  Payment,
} from '@agoric/ertp';
import type { Subscriber } from '@agoric/notifier';
import type { ERef, EReturn } from '@endo/eventual-send';
import type { Bundle, BundleID } from '@agoric/swingset-vat';
import type { ContractStartFunction, StartParams } from './utils.js';

export type IssuerKeywordRecord = Record<Keyword, Issuer<any>>;

/** @see {@link https://github.com/sindresorhus/type-fest/blob/main/source/is-any.d.ts} */
type IsAny<T> = 0 extends 1 & NoInfer<T> ? true : false;

/**
 * Zoe provides a framework for deploying and working with smart
 * contracts. It is accessed as a long-lived and well-trusted service
 * that enforces offer safety for the contracts that use it. Zoe has a
 * single `invitationIssuer` for the entirety of its lifetime. By
 * having a reference to Zoe, a user can get the `invitationIssuer`
 * and thus validate any `invitation` they receive from someone else.
 *
 * Zoe has two different facets: the public Zoe service and the
 * contract facet (ZCF). Each contract instance has a copy of ZCF
 * within its vat. The contract and ZCF never have direct access to
 * the users' payments or the Zoe purses.
 */
export type ZoeService = {
  /**
   * Zoe has a single `invitationIssuer` for the entirety of its
   * lifetime. By having a reference to Zoe, a user can get the
   * `invitationIssuer` and thus validate any `invitation` they receive
   * from someone else. The mint associated with the invitationIssuer
   * creates the ERTP payments that represent the right to interact with
   * a smart contract in particular ways.
   */
  getInvitationIssuer: GetInvitationIssuer;
  install: InstallBundle;
  installBundleID: InstallBundleID;
  startInstance: import('./utils.js').StartInstance;
  offer: Offer;
  getPublicFacet: <I extends Instance>(
    instance: ERef<I>,
  ) => Promise<
    IsAny<I> extends true
      ? any
      : I extends import('./utils.js').Instance<
            infer SF extends ContractStartFunction
          >
        ? IsAny<SF> extends true
          ? unknown
          : EReturn<SF>['publicFacet']
        : never
  >;
  getIssuers: GetIssuers;
  getBrands: GetBrands;
  getTerms: <I extends ERef<Instance>>(
    instance: I,
  ) => IsAny<I> extends true
    ? Promise<any>
    : I extends ERef<
          import('./utils.js').Instance<infer SF extends ContractStartFunction>
        >
      ? IsAny<SF> extends true
        ? Promise<unknown>
        : Promise<StartParams<SF>['terms']>
      : never;
  getOfferFilter: (instance: ERef<Instance>) => Promise<string[]>;
  getInstallationForInstance: GetInstallationForInstance;
  getInstance: GetInstance;
  getInstallation: GetInstallation;
  /**
   *   Return an object with the instance, installation, description, invitation
   *   handle, and any custom properties specific to the contract.
   */
  getInvitationDetails: GetInvitationDetails;
  getFeeIssuer: GetFeeIssuer;
  getConfiguration: GetConfiguration;
  getBundleIDFromInstallation: GetBundleIDFromInstallation;
  /**
   *   Return the pattern (if any) associated with the invitationHandle that a
   *   proposal is required to match to be accepted by zoe.offer().
   */
  getProposalShapeForInvitation: (
    invitationHandle: InvitationHandle,
  ) => import('@endo/patterns').Pattern | undefined;
};
type GetInvitationIssuer = () => Promise<Issuer<'set', InvitationDetails>>;
type GetFeeIssuer = () => Promise<Issuer<'nat'>>;
type GetConfiguration = () => {
  feeIssuerConfig: FeeIssuerConfig;
};
export type GetIssuers = (
  instance: import('./utils.js').Instance<any>,
) => Promise<IssuerKeywordRecord>;
export type GetBrands = (
  instance: import('./utils.js').Instance<any>,
) => Promise<BrandKeywordRecord>;
type GetInstallationForInstance = (
  instance: import('./utils.js').Instance<any>,
) => Promise<Installation>;
export type GetInstance = (
  invitation: ERef<import('../types-index.js').Invitation>,
) => Promise<import('./utils.js').Instance<any>>;
export type GetInstallation = (
  invitation: ERef<import('../types-index.js').Invitation>,
) => Promise<Installation>;
export type GetInvitationDetails = (
  invitation: ERef<import('../types-index.js').Invitation<any, any>>,
) => Promise<InvitationDetails>;
/**
 * Create an installation by safely evaluating the code and
 * registering it with Zoe. Returns an installation.
 */
export type InstallBundle = (
  bundle: Bundle | SourceBundle,
  bundleLabel?: string | undefined,
) => Promise<Installation>;
/**
 * Create an installation from a Bundle ID. Returns an installation.
 */
export type InstallBundleID = (
  bundleID: BundleID,
  bundleLabel?: string | undefined,
) => Promise<Installation>;
/**
 * Verify that an alleged Installation is real, and return the Bundle ID it
 * will use for contract code.
 */
export type GetBundleIDFromInstallation = (
  allegedInstallation: ERef<Installation>,
) => Promise<string>;
/**
 * To redeem an invitation, the user normally provides a proposal (their
 * rules for the offer) as well as payments to be escrowed by Zoe.  If
 * either the proposal or payments would be empty, indicate this by
 * omitting that argument or passing undefined, rather than passing an
 * empty record.
 *
 * The proposal has three parts: `want` and `give` are used by Zoe to
 * enforce offer safety, and `exit` is used to specify the particular
 * payout-liveness policy that Zoe can guarantee. `want` and `give`
 * are objects with keywords as keys and amounts as values.
 * `paymentKeywordRecord` is a record with keywords as keys, and the
 * values are the actual payments to be escrowed. A payment is
 * expected for every rule under `give`.
 */
export type Offer = <Result, Args = undefined>(
  invitation: ERef<import('../types-index.js').Invitation<Result, Args>>,
  proposal?: Proposal,
  paymentKeywordRecord?: PaymentPKeywordRecord,
  offerArgs?: Args,
) => Promise<UserSeat<Result>>;
/**
 * Zoe uses seats to access or manipulate offers. They let contracts and users
 * interact with them. Zoe has two kinds of seats. ZCFSeats are used within
 * contracts and with zcf methods. UserSeats represent offers external to Zoe
 * and the contract. The party who exercises an invitation and sends the offer()
 * message to Zoe gets a UserSeat that can check payouts' status or retrieve the
 * result of processing the offer in the contract. This varies, but examples are
 * a string and an invitation for another seat.
 *
 * Also, a UserSeat can be handed to an agent outside Zoe and the contract,
 * letting them query or monitor the current state, access the payouts and
 * result, and, if it's allowed for this seat, call tryExit().
 *
 * Since anyone can attempt to exit the seat if they have a reference to it, you
 * should only share a UserSeat with trusted parties.
 *
 * UserSeat includes queries for the associated offer's current state and an
 * operation to request that the offer exit, as follows:
 */
export type UserSeat<OR = unknown> = {
  getProposal: () => Promise<ProposalRecord>;
  /**
   * returns a promise for a KeywordPaymentRecord containing all the payouts from
   * this seat. The promise will resolve after the seat has exited.
   */
  getPayouts: () => Promise<PaymentPKeywordRecord>;
  /**
   * returns a promise for the Payment corresponding to the indicated keyword.
   * The promise will resolve after the seat has exited. If there is no payment
   * corresponding to the keyword, an error will be thrown. (It used to return
   * undefined.)
   */
  getPayout: (keyword: Keyword) => Promise<Payment<any, any>>;
  getOfferResult: () => Promise<OR>;
  /**
   * Note: Only works if the seat's `proposal` has an `OnDemand` `exit` clause. Zoe's
   * offer-safety guarantee applies no matter how a seat's interaction with a
   * contract ends. Under normal circumstances, the participant might be able to
   * call `tryExit()`, or the contract might do something explicitly. On exiting,
   * the seat holder gets its current `allocation` and the `seat` can no longer
   * interact with the contract.
   */
  tryExit?: (() => void) | undefined;
  /**
   * Returns true if the seat has exited, false if it is still active.
   */
  hasExited: () => Promise<boolean>;
  /**
   * returns 1 if the proposal's
   * want clause was satisfied by the final allocation, otherwise 0. This is
   * numeric to support a planned enhancement called "multiples" which will allow
   * the return value to be any non-negative number. The promise will resolve
   * after the seat has exited.
   */
  numWantsSatisfied: () => Promise<0 | 1>;
  /**
   * return a promise for the final allocation. The promise will resolve after the
   * seat has exited.
   */
  getFinalAllocation: () => Promise<Allocation>;
  /**
   * returns a subscriber that
   * will be notified when the seat has exited or failed.
   */
  getExitSubscriber: () => Subscriber<import('../types-index.js').Completion>;
};
export type Proposal = Partial<ProposalRecord>;
export type ProposalRecord = {
  give: AmountKeywordRecord;
  want: AmountKeywordRecord;
  exit: ExitRule;
};
/**
 * The keys are keywords, and the values are amounts. For example:
 * { Asset: AmountMath.make(assetBrand, 5n), Price:
 * AmountMath.make(priceBrand, 9n) }
 */
export type AmountKeywordRecord = Record<Keyword, AnyAmount>;
export type Waker = {
  wake: () => void;
};
export type OnDemandExitRule = {
  onDemand: null;
};
export type WaivedExitRule = {
  waived: null;
};
export type AfterDeadlineExitRule = {
  afterDeadline: {
    timer: import('@agoric/time').TimerService;
    deadline: import('@agoric/time').Timestamp;
  };
};
/**
 * The possible keys are 'waived', 'onDemand', and 'afterDeadline'.
 * `timer` and `deadline` only are used for the `afterDeadline` key.
 * The possible records are:
 * `{ waived: null }`
 * `{ onDemand: null }`
 * `{ afterDeadline: { timer :Timer<Deadline>, deadline :Deadline } }`
 */
export type ExitRule =
  | OnDemandExitRule
  | WaivedExitRule
  | AfterDeadlineExitRule;
export type Instance<SF = any> = import('./utils.js').Instance<SF>;
export type ZCFSpec =
  | {
      bundleCap: import('@agoric/swingset-vat').BundleCap;
    }
  | {
      name: string;
    }
  | {
      /** Bundle ID */
      id: string;
    };
/**
 * Opaque type for a JSONable source bundle
 */
export type SourceBundle = Record<string, any>;
export type PaymentPKeywordRecord = Record<Keyword, ERef<Payment<any>>>;
export type PaymentKeywordRecord = Record<Keyword, Payment<any>>;
export type InvitationDetails = {
  installation: Installation;
  instance: import('./utils.js').Instance<any>;
  handle: InvitationHandle;
  description: string;
  customDetails?: Record<string, any> | undefined;
};
export type Installation<SF = any> = import('./utils.js').Installation<SF>;
export type InstallationStart<I extends Installation> =
  import('./utils.js').InstallationStart<I>;
export type FeeIssuerConfig = {
  name: string;
  assetKind: AssetKind;
  displayInfo: DisplayInfo;
};
export type ZoeFeesConfig = {
  getPublicFacetFee: NatValue;
};
export type FeeMintAccess = Handle<'feeMintAccess'>;
