import { expectNotType, expectType } from 'tsd';
import { E, ERef } from '@endo/far';
import type { Remote } from '../src/types.js';
import type { StorageNode } from '../src/lib-chainStorage.js';

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
