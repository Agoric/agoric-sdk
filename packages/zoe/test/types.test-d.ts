/**
 * @file uses .ts syntax to be able to declare types (e.g. of kit.creatorFacet as {})
 * because "there is no JavaScript syntax for passing a a type argument"
 * https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
 */
import { E } from '@endo/eventual-send';
import { expectType } from 'tsd';

import type { start as scaledPriceAuthorityStart } from '../src/contracts/scaledPriceAuthority.js';

{
  const zoe = {} as ZoeService;
  const scaledPriceInstallation = {} as Installation<
    typeof scaledPriceAuthorityStart
  >;

  const mock = null as any;
  const kit = await E(zoe).startInstance(scaledPriceInstallation);
  // @ts-expect-error
  kit.notInKit;
  E(kit.publicFacet).getPriceAuthority();

  expectType<{}>(kit.creatorFacet);

  const validIssuers = {};

  E(zoe).startInstance(
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
  E(zoe).startInstance(scaledPriceInstallation, validIssuers, validTerms);
  const validPrivates = {};
  E(zoe).startInstance(
    scaledPriceInstallation,
    validIssuers,
    validTerms,
    validPrivates,
  );
  E(zoe).startInstance(
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
