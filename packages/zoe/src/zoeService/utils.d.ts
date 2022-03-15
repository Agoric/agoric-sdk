import type { Instance, IssuerKeywordRecord, Payment } from './types.js';

type SourceBundle = Record<string, any>;

type AdminFacet = {
  getVatShutdownPromise: () => Promise<any>; // Completion, which is currently any
};

export type Installation<C> = {
  getBundle: () => SourceBundle;
};

export type ContractOfInstallation<Type> = Type extends Installation<infer X>
  ? X
  : never;

interface ContractSpec {
  creatorFacet?: {};
  publicFacet?: {};
  creatorInvitation?: Payment;
}

export type ContractKit<C> = C extends ContractSpec
  ? {
      creatorFacet: C['creatorFacet'];
      publicFacet: C['publicFacet'];
      instance: Instance;
      creatorInvitation: C['creatorInvitation'];
      adminFacet: AdminFacet;
    }
  : {
      creatorFacet: any;
      publicFacet: any;
      instance: Instance;
      creatorInvitation: any;
      adminFacet: AdminFacet;
    };

export type CKitForInstallation<I> = ContractKit<ContractOfInstallation<I>>;

/**
 * Zoe is long-lived. We can use Zoe to create smart contract
 * instances by specifying a particular contract installation to use,
 * as well as the `terms` of the contract. The `terms.issuers` is a
 * record mapping string names (keywords) to issuers, such as `{
 * Asset: simoleanIssuer}`. (Note that the keywords must begin with a
 * capital letter and must be ASCII identifiers.) Parties to the
 * contract will use the keywords to index their proposal and their
 * payments.
 *
 * The custom terms are the arguments to the contract, such as the
 * number of bids an auction will wait for before closing. Custom
 * terms are up to the discretion of the smart contract. We get back
 * the creator facet, public facet, and creator invitation as defined
 * by the contract.
 */
export type StartInstance = <I extends Installation<any>>(
  installation: I | PromiseLike<I>,
  issuerKeywordRecord?: IssuerKeywordRecord,
  terms?: Object,
  privateArgs?: Object,
) => Promise<CKitForInstallation<I>>;
