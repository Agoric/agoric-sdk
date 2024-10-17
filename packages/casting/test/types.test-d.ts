/* eslint-disable */
import { E } from '@endo/far';
import { expectType } from 'tsd';
import type { ValueFollower } from '../src/follower-cosmjs.js';
import { makeFollower } from '../src/follower.js';
import { iterateLatest } from '../src/iterable.js';
import { makeLeader } from '../src/leader-netconfig.js';
import type { ValueFollowerElement } from '../src/types.js';

type ThePublishedDatum = { a: 1; b: 'two' };
type TheFollowerElement = ValueFollowerElement<ThePublishedDatum>;

const leader = makeLeader();

{
  const f = makeFollower<ThePublishedDatum>('', leader, {});
  expectType<ValueFollower<ThePublishedDatum>>(await f);

  expectType<AsyncIterable<TheFollowerElement>>(await E(f).getLatestIterable());

  expectType<AsyncIterable<TheFollowerElement>>(await E(f).getLatestIterable());

  expectType<AsyncIterable<TheFollowerElement>>(
    await E(f).getReverseIterable(),
  );

  const iter = iterateLatest(f);
  for await (const { value } of iter) {
    assert(value, 'value undefined');
    expectType<ThePublishedDatum>(value);
  }
}
