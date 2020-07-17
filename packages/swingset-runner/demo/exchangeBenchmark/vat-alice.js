import { buildRootObjectCommon } from './exchanger';

export function buildRootObject(vatPowers) {
  return buildRootObjectCommon('alice', vatPowers);
}
