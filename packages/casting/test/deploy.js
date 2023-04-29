import { E } from '@endo/far';
import { iterateLatest, makeFollower } from '../src/main.js';

const COLLATERAL = 'ATOM';
const getVaultManagerMetrics = async (homeP, { cache, lookup }) => {
  const zoe = E.get(homeP).zoe;
  const publicFacet = cache(`publicFacet.vault`, () =>
    E(zoe).getPublicFacet(lookup('agoricNames', 'instance', 'VaultFactory')),
  );
  const brand = await cache(`brand.${COLLATERAL}`, () =>
    lookup('agoricNames', 'brand', COLLATERAL),
  );
  const manager = cache([`vault.manager`, brand], () =>
    E(publicFacet).getCollateralManager(brand),
  );
  const subscription = cache([`subscription`, brand], () =>
    E(manager).getMetrics(),
  );
  return cache([`subscription.key2`, brand], () =>
    E(subscription).getStoreKey(),
  );
};

export default async (homeP, { cache, lookup, makeDefaultLeader }) => {
  // const storeKey = getStoreKeyFromCache(homeP, { cache, lookup });
  const storeKey = getVaultManagerMetrics(homeP, { cache, lookup });

  console.log('storeKey', await storeKey);

  const leader = makeDefaultLeader();
  const follower = makeFollower(storeKey, leader);
  for await (const { value } of iterateLatest(follower)) {
    console.log(`here's a value`, value);
  }
};
