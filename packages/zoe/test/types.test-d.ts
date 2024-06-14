/**
 * @file uses .ts syntax to be able to declare types (e.g. of kit.creatorFacet as {})
 * because "there is no JavaScript syntax for passing a a type argument"
 * https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
 */

import { E, RemoteFunctions } from '@endo/eventual-send';
import { expectNotType, expectType } from 'tsd';

import { M, type Key } from '@endo/patterns';
// 'prepare' is deprecated but still supported
import type { prepare as scaledPriceAuthorityStart } from '../src/contracts/scaledPriceAuthority.js';
import type { Instance } from '../src/zoeService/utils.js';

const zoe = {} as ZoeService;
const scaledPriceInstallation = {} as Installation<
  typeof scaledPriceAuthorityStart
>;
const mock = null as any;

{
  const kit = await E(zoe).startInstance(scaledPriceInstallation);
  // @ts-expect-error
  kit.notInKit;
  void E(kit.publicFacet).getPriceAuthority();

  expectType<{}>(kit.creatorFacet);

  const validIssuers = {};

  void E(zoe).startInstance(
    scaledPriceInstallation,
    validIssuers,
    // @ts-expect-error missing terms
    {},
  );
  const validTerms = {
    sourcePriceAuthority: mock,
    scaleIn: mock,
    scaleOut: mock,
  };
  void E(zoe).startInstance(scaledPriceInstallation, validIssuers, validTerms);
  const validPrivates = {};
  void E(zoe).startInstance(
    scaledPriceInstallation,
    validIssuers,
    validTerms,
    validPrivates,
  );
  void E(zoe).startInstance(
    scaledPriceInstallation,
    validIssuers,
    {
      ...validTerms,
      // @ts-expect-error includes an extra term
      extra: 'invalid',
    },
    validPrivates,
  );
  // This test can no longer check that the type of `privateArgs` is inferred
  // since the contract used for testing does not define any specific private args.
  // Because we do not have strict type checks turned on, TS downgrade the type
  // `object` to `any`, making any invalid argument style check impossible.
  // E(zoe).startInstance(
  //   scaledPriceInstallation,
  //   validIssuers,
  //   validTerms,
  //   // @ts-expect-error
  //   'invalid privateArgs',
  // );
}

{
  const zcf = {} as ZCF;
  const invitation = await zcf.makeInvitation(() => 1n, 'invitation');
  expectType<Invitation<bigint>>(invitation);
  const userSeat = E(zoe).offer(invitation);
  const result = await E(userSeat).getOfferResult();
  // @ts-expect-error
  result.notInResult;
  expectType<bigint>(result);
}

{
  const zcfSeat: ZCFSeat = null as any;
  expectType<Key>(zcfSeat);
}

{
  const { instance } = await E(zoe).startInstance(scaledPriceInstallation);
  expectType<Instance<typeof scaledPriceAuthorityStart>>(instance);

  // XXX remote method requires E()
  const pf1 = await zoe.getPublicFacet(instance);
  void pf1.getPriceAuthority();
  // @ts-expect-error
  pf1.notInPublicFacet;

  const rf: RemoteFunctions<typeof zoe> = mock;
  rf.getPublicFacet;

  const pf2 = await E(zoe).getPublicFacet(instance);
  void pf2.getPriceAuthority();
  // @ts-expect-error
  pf2.notInPublicFacet;
}

{
  const start = async (
    zcf: ZCF<{ anchorBrand: Brand<'nat'> }>,
    privateArgs: {
      storageNode: StorageNode;
      marshaller: Marshaller;
      feeMintAccess?: FeeMintAccess;
    },
  ) => ({});

  const meta: ContractMeta<typeof start> = {
    // XXX not detected
    extrakey: 'bad',
    privateArgsShape: {
      // @ts-expect-error extra key
      extraKey: 'bad',
      marshaller: mock,
      storageNode: mock,
    },
    // @ts-expect-error invalid upgradability value
    upgradability: 'invalid',
  };

  const metaWithSplitRecord: ContractMeta<typeof start> = {
    // XXX not detected
    extrakey: 'bad',
    // @ts-expect-error Matcher not assignable
    privateArgsShape: M.splitRecord({
      extraKey: 'bad',
      marshaller: mock,
      storageNode: mock,
    }),
  };
}
