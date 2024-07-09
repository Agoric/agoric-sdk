import { Far } from '@endo/far';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import type { ExecutionContext } from 'ava';
import { commonSetup } from '../supports.js';
import { prepareCosmosOrchestrationAccount } from '../../src/exos/cosmos-orchestration-account.js';

export const prepareMakeTestCOAKit = (
  t: ExecutionContext,
  bootstrap: Awaited<ReturnType<typeof commonSetup>>['bootstrap'],
  { zcf = Far('MockZCF', {}) } = {},
) => {
  const { orchestration, marshaller, rootZone, timer, vowTools } = bootstrap;

  const { makeRecorderKit } = prepareRecorderKitMakers(
    rootZone.mapStore('CosmosOrchAccountRecorder'),
    marshaller,
  );

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    rootZone.subZone('CosmosOrchAccount'),
    makeRecorderKit,
    vowTools,
    // @ts-expect-error mocked zcf
    zcf,
  );

  return async ({
    storageNode = bootstrap.storage.rootNode.makeChildNode('accounts'),
    chainId = 'cosmoshub-99',
    hostConnectionId = 'connection-0' as const,
    controllerConnectionId = 'connection-1' as const,
    bondDenom = 'uatom',
  } = {}) => {
    t.log('exo setup - prepareCosmosOrchestrationAccount');

    t.log('request account from orchestration service');
    const cosmosOrchAccount = await E(orchestration).makeAccount(
      chainId,
      hostConnectionId,
      controllerConnectionId,
    );

    const accountAddress = await E(cosmosOrchAccount).getAddress();

    t.log('make a CosmosOrchestrationAccount');
    const holder = makeCosmosOrchestrationAccount(accountAddress, bondDenom, {
      account: cosmosOrchAccount,
      storageNode: storageNode.makeChildNode(accountAddress.address),
      icqConnection: undefined,
      timer,
    });

    return holder;
  };
};
