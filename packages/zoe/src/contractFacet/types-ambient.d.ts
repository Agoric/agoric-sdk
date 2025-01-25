/// <reference types="@agoric/ertp/exported" />
/// <reference types="@endo/pass-style" />
/// <reference path="../zoeService/utils.d.ts" />

/**
 * Any passable non-thenable. Often an explanatory string.
 */
type Completion = import('@endo/pass-style').Passable;
type ZCFMakeEmptySeatKit = (exit?: ExitRule | undefined) => ZcfSeatKit;

type InvitationAmount = Amount<'set', InvitationDetails>;

/**
 * Zoe Contract Facet
 *
 * The Zoe interface specific to a contract instance. The Zoe Contract
 * Facet is an API object used by running contract instances to access
 * the Zoe state for that instance. The Zoe Contract Facet is accessed
 * synchronously from within the contract, and usually is referred to
 * in code as zcf.
 */
type ZCF<CT = Record<string, unknown>> = {
  /**
   * - atomically reallocate amounts among seats.
   */
  atomicRearrange: (transfers: TransferPart[]) => void;
  /**
   * - check
   * whether a keyword is valid and unique and could be added in
   * `saveIssuer`
   */
  assertUniqueKeyword: (keyword: Keyword) => void;
  /**
   * Informs Zoe about an issuer and returns a promise for acknowledging
   * when the issuer is added and ready.
   *
   * @returns the AmountMath and brand synchronously accessible after
   * saving
   */
  saveIssuer: <I extends Issuer>(
    issuerP: ERef<I>,
    keyword: Keyword,
  ) => Promise<I extends Issuer<infer K, infer M> ? IssuerRecord<K, M> : never>;

  /**
   * Make a credible Zoe invitation for a particular smart contract
   * indicated by the `instance` in the details of the invitation. Zoe
   * also puts the `installation` and a unique `handle` in the details
   * of the invitation. The contract must provide a `description` for
   * the invitation and should include whatever information is necessary
   * for a potential buyer of the invitation to know what they are
   * getting in the `customDetails`. `customDetails` will be
   * placed in the details of the invitation.
   */
  makeInvitation: <R, A = undefined>(
    offerHandler: OfferHandler<ERef<R>, A>,
    description: string,
    customDetails?: object,
    proposalShape?: Pattern,
  ) => Promise<Invitation<R, A>>;
  shutdown: (completion: Completion) => void;
  shutdownWithFailure: import('@agoric/swingset-vat').ShutdownWithFailure;
  getZoeService: () => ERef<ZoeService>;
  getInvitationIssuer: () => Issuer<'set'>;
  getTerms: () => StandardTerms & CT;
  getBrandForIssuer: <K extends AssetKind>(issuer: Issuer<K>) => Brand<K>;
  getIssuerForBrand: <K_1 extends AssetKind>(brand: Brand<K_1>) => Issuer<K_1>;
  getAssetKind: GetAssetKindByBrand;
  makeZCFMint: <K_2 extends AssetKind = 'nat'>(
    keyword: Keyword,
    assetKind?: K_2 | undefined,
    displayInfo?: AdditionalDisplayInfo,
    options?: import('@agoric/ertp').IssuerOptionsRecord,
  ) => Promise<ZCFMint<K_2>>;
  registerFeeMint: ZCFRegisterFeeMint;
  makeEmptySeatKit: ZCFMakeEmptySeatKit;
  setTestJig: SetTestJig;
  stopAcceptingOffers: () => Promise<void>;
  setOfferFilter: (strings: Array<string>) => Promise<void>;
  getOfferFilter: () => Promise<Array<string>>;
  getInstance: () => Instance;
};

type TransferPart = [
  fromSeat?: ZCFSeat,
  toSeat?: ZCFSeat,
  fromAmounts?: AmountKeywordRecord,
  toAmounts?: AmountKeywordRecord,
];

type ZCFRegisterFeeMint = (
  keyword: Keyword,
  allegedFeeMintAccess: FeeMintAccess,
) => Promise<ZCFMint<'nat'>>;
/**
 * Provide a jig object for testing purposes only.
 *
 * The contract code provides a callback whose return result will
 * be made available to the test that started this contract. The
 * supplied callback will only be called in a testing context,
 * never in production; i.e., it is only called if `testJigSetter`
 * was supplied.
 *
 * If no `testFn` is supplied, then an empty jig will be used.
 * An additional `zcf` property set to the current ContractFacet
 * will be appended to the returned jig object (overriding any
 * provided by the `testFn`).
 */
type SetTestJig = (testFn?: () => Record<string, unknown>) => void;
type ZCFMint<K extends AssetKind = AssetKind> = {
  getIssuerRecord: () => IssuerRecord<K>;
  /**
   * All the amounts in gains must be of this ZCFMint's brand.
   * The gains' keywords are in the namespace of that seat.
   * Add the gains to that seat's allocation.
   * The resulting state must be offer safe. (Currently, increasing assets can
   * never violate offer safety anyway.)
   *
   * Mint that amount of assets into the pooled purse.
   * If a seat is provided, it is returned. Otherwise a new seat is
   * returned.
   */
  mintGains: (gains: AmountKeywordRecord, zcfSeat?: ZCFSeat) => ZCFSeat;
  /**
   * All the amounts in losses must be of this ZCFMint's brand.
   * The losses' keywords are in the namespace of that seat.
   * Subtract losses from that seat's allocation.
   * The resulting state must be offer safe.
   *
   * Burn that amount of assets from the pooled purse.
   */
  burnLosses: (losses: AmountKeywordRecord, zcfSeat: ZCFSeat) => void;
};
/**
 * fail called with the reason for this failure, where reason is
 * normally an instanceof Error.
 */
type ZCFSeatFail = (reason: unknown) => Error;
type ZCFSeat = import('@endo/pass-style').RemotableObject & {
  exit: (completion?: Completion) => void;
  fail: ZCFSeatFail;
  getSubscriber: () => Promise<Subscriber<Allocation>>;
  hasExited: () => boolean;
  getProposal: () => ProposalRecord;
  /**
   * @param brand used for filling in an empty amount if the `keyword`
   * is not present in the allocation
   */
  getAmountAllocated: <B extends Brand>(
    keyword: Keyword,
    brand?: B,
  ) => B extends Brand<infer K> ? Amount<K> : Amount;
  getCurrentAllocation: () => Allocation;
  isOfferSafe: (newAllocation: Allocation) => boolean;
};
type ZcfSeatKit = {
  zcfSeat: ZCFSeat;
  userSeat: Promise<UserSeat>;
};
type HandleOffer<OR, OA> = (seat: ZCFSeat, offerArgs: OA) => OR;
type OfferHandler<OR = unknown, OA = never> =
  | HandleOffer<OR, OA>
  | {
      handle: HandleOffer<OR, OA>;
    };
type ContractMeta<
  SF extends // import inline to maintain ambient mode
    import('../zoeService/utils').ContractStartFunction = import('../zoeService/utils').ContractStartFunction,
> = {
  customTermsShape?: Record<
    Parameters<SF>[0] extends ZCF<infer CT> ? keyof CT : never,
    Pattern
  >;
  privateArgsShape?: { [K in keyof Parameters<SF>[1]]: Pattern };
  /**
   * - `none` means that the contract is not upgradable.
   * - `canUpgrade` means this code can perform an upgrade
   * - `canBeUpgraded` means that the contract stores kinds durably such that the next version can upgrade
   */
  upgradability?: 'none' | 'canBeUpgraded' | 'canUpgrade' | undefined;
};
/**
 * API for a contract start function.
 *
 * CAVEAT: assumes synchronous
 */
type ContractStartFn<PF = any, CF = any, CT = any, PA = any> = (
  zcf: ZCF<CT>,
  privateArgs: PA,
  baggage: import('@agoric/vat-data').Baggage,
) => ContractStartFnResult<PF, CF>;
type ContractStartFnResult<PF, CF> = {
  publicFacet?: PF;
  creatorFacet?: CF;
  creatorInvitation?: Promise<Invitation<any, any>> | undefined;
};

// XXX redef, losing documentation
type ContractOf<S extends (...args: any) => any> =
  import('../zoeService/utils').ContractOf<S>;
type AdminFacet = import('../zoeService/utils').AdminFacet<any>;

declare const OfferReturn: unique symbol;
declare const OfferArgs: unique symbol;
type Invitation<R = unknown, A = undefined> = Payment<
  'set',
  InvitationDetails
> & {
  // because TS is structural, without this the generic is ignored
  [OfferReturn]?: R;
  [OfferArgs]?: A;
};
