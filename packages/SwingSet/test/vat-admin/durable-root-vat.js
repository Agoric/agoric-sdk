import { makeKindHandle, defineDurableKind } from '@agoric/vat-data';

// root objects must be ephemeral, not virtual/durable

export function buildRootObject() {
  const initData = () => ({});
  const behavior = {};
  const kh = makeKindHandle('root');
  const makeRoot = defineDurableKind(kh, initData, behavior);
  const root = makeRoot();
  return root;
}
