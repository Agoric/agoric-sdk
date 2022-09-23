import {
  AmountShape,
  AssetKindShape,
  DisplayInfoShape,
  IssuerShape,
  IssuerKitShape,
  BrandShape,
  PaymentShape,
} from '@agoric/ertp';
import { M } from '@agoric/store';
import { TimestampValueShape } from '@agoric/swingset-vat/src/vats/timer/typeGuards.js';

// keywords have an initial cap
export const KeywordShape = M.string();

// TODO should be exported from Notifiers.
export const NotifierShape = M.any();

export const InvitationHandleShape = M.remotable('InvitationHandle');
export const InvitationShape = M.remotable('Invitation');
export const InstanceHandleShape = M.remotable('InstanceHandle');
export const InstallationShape = M.remotable('Installation');
export const SeatShape = M.remotable('Seat');

export const AmountKeywordRecordShape = M.recordOf(KeywordShape, AmountShape);
export const AmountPatternKeywordRecordShape = M.recordOf(
  KeywordShape,
  M.pattern(),
);
export const PaymentKeywordRecordShape = M.recordOf(KeywordShape, PaymentShape);
export const PaymentPKeywordRecordShape = M.recordOf(
  KeywordShape,
  M.eref(PaymentShape),
);
export const IssuerKeywordRecordShape = M.recordOf(KeywordShape, IssuerShape);
export const IssuerPKeywordRecordShape = M.recordOf(
  KeywordShape,
  M.eref(IssuerShape),
);
export const BrandKeywordRecordShape = M.recordOf(KeywordShape, BrandShape);

export const IssuerRecordShape = M.split(
  {
    brand: BrandShape,
    issuer: IssuerShape,
    assetKind: AssetKindShape,
  },
  { displayInfo: DisplayInfoShape },
);

export const TermsShape = harden({
  issuers: IssuerKeywordRecordShape,
  brands: BrandKeywordRecordShape,
});

export const InstanceRecordShape = harden({
  installation: InstallationShape,
  instance: InstanceHandleShape,
  terms: M.split(TermsShape, M.record()),
});

export const HandleI = M.interface('Handle', {});

export const makeHandleShape = name => M.remotable(`${name}Handle`);
export const TimerShape = makeHandleShape('timer');

/**
 * After defaults are filled in
 *
 * @see {ProposalRecord} type
 */
export const FullProposalShape = harden({
  want: AmountPatternKeywordRecordShape,
  give: AmountKeywordRecordShape,
  // To accept only one, we could use M.or rather than M.splitRecord,
  // but the error messages would have been worse. Rather,
  // cleanProposal's assertExit checks that there's exactly one.
  exit: M.splitRecord(
    {},
    {
      onDemand: null,
      waived: null,
      afterDeadline: {
        timer: M.eref(TimerShape),
        deadline: TimestampValueShape,
      },
    },
    {},
  ),
});
/** @see {Proposal} type */
export const ProposalShape = M.splitRecord({}, FullProposalShape, {});

export const isOnDemandExitRule = exit => {
  const [exitKey] = Object.keys(exit);
  return exitKey === 'onDemand';
};

/**
 * @param {ExitRule} exit
 * @returns {exit is WaivedExitRule}
 */
export const isWaivedExitRule = exit => {
  const [exitKey] = Object.keys(exit);
  return exitKey === 'waived';
};

/**
 * @param {ExitRule} exit
 * @returns {exit is AfterDeadlineExitRule}
 */
export const isAfterDeadlineExitRule = exit => {
  const [exitKey] = Object.keys(exit);
  return exitKey === 'afterDeadline';
};

export const InvitationElementShape = M.splitRecord({
  description: M.string(),
  handle: InvitationHandleShape,
  instance: InstanceHandleShape,
  installation: InstallationShape,
});

export const OfferHandlerI = M.interface('OfferHandler', {
  handle: M.call(SeatShape).optional(M.any()).returns(M.string()),
});

export const SeatHandleAllocations = M.arrayOf(
  harden({
    seatHandle: SeatShape,
    allocation: AmountKeywordRecordShape,
  }),
);

export const ZoeMintShape = M.interface('ZoeMint', {
  getIssuerRecord: M.call().returns(IssuerRecordShape),
  mintAndEscrow: M.call(AmountShape).returns(),
  withdrawAndBurn: M.call(AmountShape).returns(),
});

export const ZcfMintShape = M.interface('ZcfMint', {
  getIssuerRecord: M.call().returns(IssuerRecordShape),
  mintGains: M.call(AmountKeywordRecordShape, M.remotable()).returns(),
  burnLosses: M.call(AmountKeywordRecordShape, M.remotable()).returns(),
});

export const ExitObjectShape = M.interface('Exit Object', {
  exit: M.call().returns(),
});

export const InstanceAdminShape = M.interface('InstanceAdmin', {
  makeInvitation: M.call(InvitationHandleShape, M.string())
    .optional(M.any(), M.pattern())
    .returns(M.promise()),
  saveIssuer: M.call(M.eref(IssuerShape), M.string()).returns(M.promise()),
  makeZoeMint: M.call(KeywordShape)
    .optional(AssetKindShape, DisplayInfoShape, M.pattern())
    .returns(M.remotable()),
  registerFeeMint: M.call(KeywordShape, M.remotable()).returns(M.remotable()),
  makeNoEscrowSeatKit: M.call(
    AmountKeywordRecordShape,
    ProposalShape,
    M.remotable(),
    SeatShape,
  ).returns({ userSeat: SeatShape }),
  replaceAllocations: M.call(SeatHandleAllocations).returns(),
  exitAllSeats: M.call(M.any()).returns(),
  failAllSeats: M.call(M.any()).returns(),
  exitSeat: M.call(SeatShape, M.any()).returns(),
  failSeat: M.call(SeatShape, M.any()).returns(),
  stopAcceptingOffers: M.call().returns(),
  setOfferFilter: M.call(M.arrayOf(M.string())).returns(),
  getOfferFilter: M.call().returns(M.string()),
  getExitSubscriber: M.call(SeatShape).returns(M.any()),
});

export const InstanceStorageManagerGuard = M.interface(
  'InstanceStorageManager',
  {
    getTerms: M.call().returns(M.split(TermsShape, M.record())),
    getIssuers: M.call().returns(IssuerKeywordRecordShape),
    getBrands: M.call().returns(BrandKeywordRecordShape),
    getInstallationForInstance: M.call().returns(InstallationShape),
    getInvitationIssuer: M.call().returns(IssuerShape),

    saveIssuer: M.call(IssuerShape, M.string()).returns(M.promise()),
    makeZoeMint: M.call(KeywordShape)
      .optional(AssetKindShape, DisplayInfoShape, M.pattern())
      .returns(M.or(ZoeMintShape, M.remotable(), M.promise())),
    registerFeeMint: M.call(KeywordShape, M.remotable()).returns(
      IssuerKitShape,
    ),
    getInstanceRecord: M.call().returns(InstanceRecordShape),
    getIssuerRecords: M.call().returns(M.arrayOf(IssuerRecordShape)),
    getWithdrawPayments: M.call().returns(
      M.interface('WithdrawFacet', {
        withdrawPayments: M.call(AmountKeywordRecordShape).returns(
          PaymentKeywordRecordShape,
        ),
      }),
    ),
    initInstanceAdmin: M.call(InstanceHandleShape, M.remotable()).returns(
      M.promise(),
    ),
    deleteInstanceAdmin: M.call(InstanceAdminShape).returns(),
    makeInvitation: M.call(InvitationHandleShape, M.string())
      .optional(M.any(), M.pattern())
      .returns(M.promise()),
    getRoot: M.call().returns(M.promise()),
    getAdminNode: M.call().returns(M.remotable()),
  },
);

const BundleCapShape = M.any();

export const ZoeStorageMangerInterface = {
  zoeServiceDataAccess: M.interface('ZoeService dataAccess', {
    getTerms: M.call(InstanceHandleShape).returns(
      M.split(TermsShape, M.record()),
    ),
    getIssuers: M.call(InstanceHandleShape).returns(M.promise()),
    getBrands: M.call(InstanceHandleShape).returns(M.promise()),
    getInstallationForInstance: M.call(InstanceHandleShape).returns(
      M.promise(),
    ),
    getInvitationIssuer: M.call().returns(IssuerShape),

    getBundleIDFromInstallation: M.call(M.any()).returns(M.promise()),
    installBundle: M.call(M.any()).returns(M.promise()),
    installBundleID: M.call(M.string()).returns(M.promise()),

    getPublicFacet: M.call(M.eref(InstanceHandleShape)).returns(M.promise()),
    getOfferFilter: M.call(M.eref(InstanceHandleShape)).returns(M.promise()),
    setOfferFilter: M.call(
      InstanceHandleShape,
      M.arrayOf(M.string()),
    ).returns(),
    getProposalShapeForInvitation: M.call(InvitationHandleShape).returns(
      M.or(M.pattern(), M.undefined()),
    ),
  }),
  makeOfferAccess: M.interface('ZoeStorage makeOffer access', {
    getAssetKindByBrand: M.call(BrandShape).returns(AssetKindShape),
    installBundle: M.call(InstanceHandleShape).returns(),
    getInstanceAdmin: M.call(InstanceHandleShape).returns(M.remotable()),
    getProposalShapeForInvitation: M.call(InvitationHandleShape).returns(
      M.or(M.pattern(), M.undefined()),
    ),
    getInvitationIssuer: M.call().returns(IssuerShape),
    depositPayments: M.call(ProposalShape, PaymentPKeywordRecordShape).returns(
      M.promise(),
    ),
  }),
  startInstanceAccess: M.interface('ZoeStorage startInstance access', {
    makeZoeInstanceStorageManager: M.call(
      M.any(),
      InstallationShape,
      M.any(),
      IssuerPKeywordRecordShape,
      InstanceHandleShape,
      BundleCapShape,
    ).returns(M.promise()),
    unwrapInstallation: M.callWhen(M.eref(InstallationShape)).returns(M.any()),
  }),
  invitationIssuerAccess: M.interface('ZoeStorage invitationIssuer', {
    getInvitationIssuer: M.call().returns(IssuerShape),
  }),
};

export const ZoeServiceInterface = {
  zoeService: M.interface('ZoeService', {
    install: M.call(M.any()).returns(M.promise()),
    installBundleID: M.call(M.string()).returns(M.promise()),
    startInstance: M.call(M.eref(InstallationShape))
      .optional(IssuerPKeywordRecordShape, M.any(), M.any())
      .returns(M.promise()),
    offer: M.call(M.eref(InvitationShape))
      .optional(ProposalShape, PaymentPKeywordRecordShape, M.any())
      .returns(M.promise()),

    getPublicFacet: M.call(M.eref(InstanceHandleShape)).returns(M.promise()),
    getBrands: M.call(InstanceHandleShape).returns(M.promise()),
    getIssuers: M.call(InstanceHandleShape).returns(M.promise()),
    getOfferFilter: M.call(M.eref(InstanceHandleShape)).returns(M.promise()),
    setOfferFilter: M.call(
      InstanceHandleShape,
      M.arrayOf(M.string()),
    ).returns(),
    getTerms: M.call(InstanceHandleShape).returns(M.any()),
    getInstallationForInstance: M.call(InstanceHandleShape).returns(
      M.promise(),
    ),
    getInvitationIssuer: M.call().returns(M.promise()),
    getBundleIDFromInstallation: M.call(M.any()).returns(M.promise()),

    getFeeIssuer: M.call().returns(M.promise()),
    getInstance: M.call(M.eref(InvitationShape)).returns(M.promise()),
    getInstallation: M.call(M.eref(InvitationShape)).returns(M.promise()),
    getInvitationDetails: M.call(M.eref(InvitationShape)).returns(M.any()),
    getConfiguration: M.call().returns({
      feeIssuerConfig: {
        name: M.string(),
        assetKind: 'nat',
        displayInfo: M.any(),
      },
    }),
    getProposalShapeForInvitation: M.call(InvitationHandleShape).returns(
      M.or(ProposalShape, M.undefined()),
    ),
  }),
  feeMintAccessRetriever: M.interface('FeeMintAccessRetriever', {
    get: M.call().returns(M.any()),
  }),
};

export const AdminFacetGuard = M.interface('ZcfAdminFacet', {
  getVatShutdownPromise: M.call().returns(M.promise()),
  restartContract: M.call().optional(M.any()).returns(M.promise()),
  upgradeContract: M.call(M.string()).optional(M.any()).returns(M.promise()),
});
