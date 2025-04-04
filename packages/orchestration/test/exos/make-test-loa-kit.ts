import { heapVowE as E } from '@agoric/vow/vat.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { Far, type EReturn } from '@endo/far';
import type { ExecutionContext } from 'ava';
import { prepareLocalOrchestrationAccountKit } from '../../src/exos/local-orchestration-account.js';
import { commonSetup } from '../supports.js';

/**
 * A testing utility that creates a LocalChainAccount and makes a
 * LocalOrchestrationAccount with necessary endowments like: recorderKit,
 * storageNode, mock ZCF, mock TimerService, and a ChainHub.
 *
 * Helps reduce boilerplate in test files, and retains testing context through
 * parameterized endowments.
 */
export const prepareMakeTestLOAKit = (
  t: ExecutionContext,
  {
    bootstrap,
    commonPrivateArgs: { marshaller },
    facadeServices: { chainHub },
    utils,
  }: EReturn<typeof commonSetup>,
  { zcf = Far('MockZCF', {}) } = {},
) => {
  const { timer, localchain, rootZone, vowTools } = bootstrap;

  const { makeRecorderKit } = prepareRecorderKitMakers(
    rootZone.mapStore('recorder'),
    marshaller,
  );

  const makeLocalOrchestrationAccountKit = prepareLocalOrchestrationAccountKit(
    rootZone,
    {
      makeRecorderKit,
      // @ts-expect-error mocked zcf. use `stake-bld.contract.test.ts` to test LCA with offer
      zcf,
      timerService: timer,
      vowTools,
      chainHub,
      localchain,
    },
  );

  return async ({
    storageNode = bootstrap.storage.rootNode.makeChildNode('accounts'),
  } = {}) => {
    t.log('exo setup - prepareLocalChainAccountKit');

    t.log('request account from vat-localchain');
    const lca = await E(localchain).makeAccount();
    const address = await E(lca).getAddress();

    t.log('make a LocalChainAccountKit');
    const { holder: account } = makeLocalOrchestrationAccountKit({
      account: lca,
      address: harden({
        value: address,
        chainId: 'agoric-3',
        encoding: 'bech32',
      }),
      storageNode: storageNode.makeChildNode(address),
    });
    return account;
  };
};
