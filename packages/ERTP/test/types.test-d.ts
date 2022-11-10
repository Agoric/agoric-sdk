import { Far } from '@endo/marshal';
import { expectType } from 'tsd';

import { AmountMath, AssetKind } from '../src/index.js';
import type { AssetValueForKind } from '../src/types.js';

{
  const brand: Brand<'nat'> = Far('natbrand');

  expectType<Amount<'nat'>>(AmountMath.makeEmpty(brand));
  expectType<Amount<'nat'>>(AmountMath.makeEmpty(brand, AssetKind.NAT));
  // @ts-expect-error TODO
  expectType<never>(AmountMath.makeEmpty(brand, AssetKind.SET));

  expectType<Amount<'nat'>>(AmountMath.make(brand, 1n));
  // @ts-expect-error invalid value for brand
  AmountMath.make(brand, {});
}

{
  const brand: Brand<'set'> = Far('setbrand');
  expectType<Amount<'set'>>(AmountMath.makeEmpty(brand, 'set'));
  expectType<Amount<'set'>>(AmountMath.make(brand, []));
  // @ts-expect-error TODO
  expectType<never>(AmountMath.make(brand, AssetKind.NAT));

  // @ts-expect-error invalid value for brand
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
