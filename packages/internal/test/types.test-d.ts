import { expectNotType, expectType } from 'tsd';
import { E, type ERef } from '@endo/far';
import { attenuate } from '../src/ses-utils.ts';
import type { Permit, Remote } from '../src/types.js';
import type { StorageNode } from '../src/lib-chainStorage.js';

{
  const obj = {
    m1: () => { },
    m2: () => { },
    data: {
      log: ['string'],
      counter: 0,
    },
    internalData: {
      realCount: 0,
    },
  };
  expectType<{ m1: () => void }>(attenuate(obj, { m1: true }));
  expectType<{ m2: () => void }>(attenuate(obj, { m2: 'pick' }));
  expectType<{ data: { log: string[]; counter: number } }>(
    attenuate(obj, { data: 'pick' }),
  );
  expectType<{ m1: () => void; data: { log: string[] } }>(
    attenuate(obj, { m1: 'pick', data: { log: true } }),
  );
  expectNotType<{ m1: () => void; m2: () => void; data: { log: string[] } }>(
    attenuate(obj, { m1: 'pick', data: { log: true } }),
  );
}

const eventualStorageNode: ERef<StorageNode> = null as any;
const remoteStorageNode: Remote<StorageNode> = null as any;

{
  // When awaited, ERef makes the object look local
  const storageNode = await eventualStorageNode;
  expectType<StorageNode>(storageNode);
  expectType<string>(storageNode.getPath());
}

{
  // When awaited, Remote is correct
  const storageNode = await remoteStorageNode; // no-op
  expectType<Remote<StorageNode>>(storageNode);
  // @ts-expect-error cannot call remote methods directly
  storageNode.getPath();
  expectType<Promise<string>>(E(storageNode).getPath());
}
