import { makeCopyBag } from '@agoric/store';
import { Far } from '@endo/marshal';
import { expectType } from 'tsd';

import { AmountMath, AssetKind } from '../src/index.js';

import '../src/types-ambient.js';

{
  const brand: Brand<'nat'> = Far('natbrand');

  expectType<Amount<'nat'>>(AmountMath.makeEmpty(brand));
  expectType<Amount<'nat'>>(AmountMath.makeEmpty(brand, AssetKind.NAT));
  // @ts-expect-error TODO
  expectType<never>(AmountMath.makeEmpty(brand, AssetKind.COPY_BAG));

  expectType<Amount<'nat'>>(AmountMath.make(brand, 1n));
  // @ts-expect-error invalid value for brand
  AmountMath.make(brand, {});
}

{
  const brand: Brand<'copyBag'> = Far('copyBagbrand');
  expectType<Amount<'copyBag'>>(AmountMath.makeEmpty(brand, 'copyBag'));
  expectType<Amount<'copyBag'>>(AmountMath.make(brand, makeCopyBag([])));
  // @ts-expect-error TODO
  expectType<never>(AmountMath.make(brand, AssetKind.NAT));

  // @ts-expect-error invalid value for brand
  AmountMath.make(brand, {});
}

{
  const natVal: AssetValueForKind<'nat'> = 0n;
  expectType<bigint>(natVal);

  const copyBagVal: AssetValueForKind<'copyBag'> = makeCopyBag([]);
  expectType<CopyBagValue>(copyBagVal);

  // @ts-expect-error 'n' doesn't satisfy AssetKind
  const n: AssetValueForKind<'n'> = null;
}
