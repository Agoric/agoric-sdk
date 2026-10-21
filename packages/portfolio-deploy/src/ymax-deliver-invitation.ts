/** @file deliver a ymax privileged invitation to a target address */
import type { Instance } from '@agoric/zoe/src/zoeService/types.js';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';
import { getCreatorFacetKey, getYmaxControlKit } from './ymax-admin-helpers.ts';

type InvitationKind = 'planner' | 'resolver' | 'ownerProxy';

const options = {
  contract: { type: 'string', default: 'ymax0' },
  kind: { type: 'string' },
  to: { type: 'string' },
} as const;

const inviters: Record<
  InvitationKind,
  (cf: any, ps: Instance, addr: string) => Promise<void>
> = {
  planner: (cf, ps, addr) => cf.deliverPlannerInvitation(addr, ps),
  resolver: (cf, ps, addr) => cf.deliverResolverInvitation(addr, ps),
  ownerProxy: (cf, ps, addr) => cf.deliverEVMWalletHandlerInvitation(addr, ps),
};

const deliverInvitation = async ({
  scriptArgs,
  walletKit,
  makeAccount,
}: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const { contract, kind, to } = values;
  if (!kind) throw Error('--kind missing');
  if (!(kind in inviters)) throw Error(`kind? ${kind}`);
  if (!to) throw Error('--to missing');

  const { account } = await getYmaxControlKit(makeAccount, contract);
  const creatorFacetKey = getCreatorFacetKey(contract);
  const creatorFacet = account.store.get(creatorFacetKey);
  const { postalService } = walletKit.agoricNames.instance;
  await inviters[kind as InvitationKind](creatorFacet, postalService, to);
};

export default deliverInvitation;
