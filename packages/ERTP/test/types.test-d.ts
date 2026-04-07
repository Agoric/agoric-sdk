import { Far } from '@endo/marshal';
import { M } from '@endo/patterns';
import type { Key, TypeFromMethodGuard } from '@endo/patterns';
import { expectType } from 'tsd';
import { AmountMath, AssetKind } from '../src/index.js';
import {
  BrandShape,
  IssuerShape,
  PaymentShape,
  PurseShape,
  DepositFacetShape,
  MintShape,
} from '../src/typeGuards.js';
import type {
  Amount,
  AssetValueForKind,
  Brand,
  DepositFacet,
  Issuer,
  Mint,
  Payment,
  Purse,
  SetValue,
} from '../src/types.js';

{
  const brand: Brand<'nat'> = Far('natbrand');

  expectType<Amount<'nat'>>(AmountMath.makeEmpty(brand));
  expectType<Amount<'nat'>>(AmountMath.makeEmpty(brand, AssetKind.NAT));
  // @ts-expect-error TODO
  expectType<never>(AmountMath.makeEmpty(brand, AssetKind.SET));

  expectType<Amount<'nat'>>(AmountMath.make(brand, 1n));
  // @ts-expect-error invalid value for amount
  AmountMath.make(brand, {});
}

{
  const brand: Brand<'set'> = Far('setbrand');
  expectType<Amount<'set'>>(AmountMath.makeEmpty(brand, 'set'));
  expectType<Amount<'set'>>(AmountMath.make(brand, []));

  // @ts-expect-error invalid value for amount
  AmountMath.make(brand, AssetKind.NAT);
  // @ts-expect-error invalid value for amount
  AmountMath.make(brand, {});
}

{
  const natVal: AssetValueForKind<'nat'> = 0n;
  expectType<bigint>(natVal);

  const setVal: AssetValueForKind<'set'> = [];
  expectType<SetValue>(setVal);

  // @ts-expect-error 'n' doesn't satisfy AssetKind
  const n: AssetValueForKind<'n'> = null;
}

{
  const issuer: Issuer = null as any;
  expectType<Key>(issuer);
}

// =============================================================================
// Typed remotable shapes from typeGuards.js
// =============================================================================
// The shapes in src/typeGuards.js are annotated as `CastedPattern<X>` so
// that Endo's pattern resolution (TypeFromPattern in @endo/patterns)
// returns the concrete X when the shape appears in a guard. CastedPattern<X>
// is a phantom "as"-style cast: trusted by the type system but unverified at
// runtime. Without the annotation, `M.remotable('Brand')` resolves to `any`,
// which loses information at every consuming site (e.g., a method
// `M.call(BrandShape)` would have its first parameter inferred as `any`
// instead of `Brand`).
//
// Note: unlike the older `MatcherOf<Tag, T>` helper, `CastedPattern<T>` puts
// no `Passable` constraint on `T`, so the cast works even for bare typedefs.
// Mint and DepositFacet are nonetheless declared as `RemotableObject & {...}`
// to accurately model that they are remotables.

// BrandShape: M.call(BrandShape) parameter is inferred as Brand
{
  const guard = M.call(BrandShape).returns(M.any());
  type Fn = TypeFromMethodGuard<typeof guard>;
  expectType<Brand>(null as unknown as Parameters<Fn>[0]);
}

// IssuerShape: parameter is Issuer
{
  const guard = M.call(IssuerShape).returns(M.any());
  type Fn = TypeFromMethodGuard<typeof guard>;
  expectType<Issuer>(null as unknown as Parameters<Fn>[0]);
}

// PaymentShape: parameter is Payment
{
  const guard = M.call(PaymentShape).returns(M.any());
  type Fn = TypeFromMethodGuard<typeof guard>;
  expectType<Payment>(null as unknown as Parameters<Fn>[0]);
}

// PurseShape: parameter is Purse
{
  const guard = M.call(PurseShape).returns(M.any());
  type Fn = TypeFromMethodGuard<typeof guard>;
  expectType<Purse>(null as unknown as Parameters<Fn>[0]);
}

// DepositFacetShape: parameter is DepositFacet
{
  const guard = M.call(DepositFacetShape).returns(M.any());
  type Fn = TypeFromMethodGuard<typeof guard>;
  expectType<DepositFacet>(null as unknown as Parameters<Fn>[0]);
}

// MintShape: parameter is Mint
{
  const guard = M.call(MintShape).returns(M.any());
  type Fn = TypeFromMethodGuard<typeof guard>;
  expectType<Mint>(null as unknown as Parameters<Fn>[0]);
}

// Return position: M.call().returns(BrandShape) infers return as Brand
{
  const guard = M.call().returns(BrandShape);
  type Fn = TypeFromMethodGuard<typeof guard>;
  expectType<Brand>(null as unknown as ReturnType<Fn>);
}
