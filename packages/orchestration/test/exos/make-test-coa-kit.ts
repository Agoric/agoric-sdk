/* eslint-disable jsdoc/require-param -- ts types */
import { heapVowE as E } from '@agoric/vow/vat.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { Far } from '@endo/far';
import type { ExecutionContext } from 'ava';
import { prepareCosmosOrchestrationAccount } from '../../src/exos/cosmos-orchestration-account.js';
import { commonSetup } from '../supports.js';

/**
 * A testing utility that creates a (Cosmos)ChainAccount and makes a
 * CosmosOrchestrationAccount with necessary endowments like: recorderKit,
 * storageNode, mock ZCF, mock TimerService, and a ChainHub.
 *
 * Helps reduce boilerplate in test files, and retains testing context through
 * parameterized endowments.
 */
export const prepareMakeTestCOAKit = (
  t: ExecutionContext,
  { bootstrap, facadeServices, utils }: Awaited<ReturnType<typeof commonSetup>>,
  { zcf = Far('MockZCF', {}) } = {},
) => {
  const { cosmosInterchainService, marshaller, rootZone, timer, vowTools } =
    bootstrap;

  const { makeRecorderKit } = prepareRecorderKitMakers(
    rootZone.mapStore('CosmosOrchAccountRecorder'),
    marshaller,
  );

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    rootZone.subZone('CosmosOrchAccount'),
    {
      chainHub: facadeServices.chainHub,
      makeRecorderKit,
      timerService: timer,
      vowTools,
      // @ts-expect-error mocked zcf
      zcf,
    },
  );

  return async ({
    storageNode = bootstrap.storage.rootNode.makeChildNode('accounts'),
    chainId = 'cosmoshub-4',
    hostConnectionId = 'connection-0' as const,
    controllerConnectionId = 'connection-1' as const,
    bondDenom = 'uatom',
  } = {}) => {
    t.log('exo setup - prepareCosmosOrchestrationAccount');

    t.log('request account from orchestration service');
    const cosmosOrchAccount = await E(cosmosInterchainService).makeAccount(
      chainId,
      hostConnectionId,
      controllerConnectionId,
    );

    const [chainAddress, localAddress, remoteAddress] = await Promise.all([
      E(cosmosOrchAccount).getAddress(),
      E(cosmosOrchAccount).getLocalAddress(),
      E(cosmosOrchAccount).getRemoteAddress(),
    ]);

    t.log('make a CosmosOrchestrationAccount');
    const holder = makeCosmosOrchestrationAccount(
      { chainAddress, bondDenom, localAddress, remoteAddress },
      {
        account: cosmosOrchAccount,
        storageNode: storageNode.makeChildNode(chainAddress.value),
        icqConnection: undefined,
        timer,
      },
    );

    t.log('register Agoric chain and BLD in ChainHub');
    utils.registerAgoricBld();

    return holder;
  };
};
